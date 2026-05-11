import * as cloudbaseModule from "@cloudbase/js-sdk/app";
import * as authModule from "@cloudbase/js-sdk/auth";
import * as mysqlModule from "@cloudbase/js-sdk/mysql";
import { cloudbaseConfig, isCloudbaseConfigured } from "./cloudbaseConfig.js";

let cloudbaseClientPromise = null;
let cloudbaseModulesRegistered = false;
const cloudbase = resolveCloudbaseModule(cloudbaseModule);

export async function loadDayCompletions(dateKey) {
  if (isCloudbaseConfigured()) await migrateLocalDayCompletions(dateKey);
  return loadRangeCompletions(dateKey, dateKey).then((records) => recordsToCompletionMap(records));
}

export async function loadRangeCompletions(startKey, endKey) {
  if (!isCloudbaseConfigured()) {
    return loadLocalRangeCompletions(startKey, endKey);
  }

  const { db, ownerId } = await getCloudbaseClient();
  const { data, error } = await db
    .from(cloudbaseConfig.tableName)
    .select("date_key,category_id,task_id,completed")
    .eq("user_id", ownerId)
    .gte("date_key", startKey)
    .lte("date_key", endKey);

  if (error) throw new Error(error.message || "CloudBase MySQL 读取完成记录失败");
  return normalizeRows(data);
}

export async function saveTaskCompletion({ dateKey, categoryId, taskId, completed }) {
  if (!isCloudbaseConfigured()) {
    saveLocalTaskCompletion({ dateKey, categoryId, taskId, completed });
    return;
  }

  const { db, ownerId } = await getCloudbaseClient();
  const { error } = await db.from(cloudbaseConfig.tableName).upsert(
    {
      user_id: ownerId,
      date_key: dateKey,
      category_id: categoryId,
      task_id: taskId,
      completed: completed ? 1 : 0,
      updated_at: getMySQLDateTime()
    },
    {
      onConflict: "user_id,date_key,category_id,task_id"
    }
  );

  if (error) throw new Error(error.message || "CloudBase MySQL 保存完成记录失败");
}

export function getProgressStoreName() {
  return isCloudbaseConfigured() ? "CloudBase MySQL" : "本机 localStorage";
}

export async function getCurrentProgressUser() {
  if (!isCloudbaseConfigured()) return { id: "local", name: "本机用户" };

  const storedUsername = getStoredUsername();
  if (!storedUsername) return null;

  const { auth } = await getCloudbaseApp();
  const user = await getAuthenticatedUser(auth);
  const id = storedUsername || getUserId(user);

  return id ? { id, name: getUserName(user) } : null;
}

export async function signInProgressUser(username, password) {
  const { auth } = await getCloudbaseApp();
  const result = await auth.signInWithPassword({ username, password });

  if (result?.error) {
    throw new Error(result.error.message || "用户名或密码登录失败");
  }

  storeUsername(username);
  return getCurrentProgressUser();
}

export async function signUpProgressUser(username, password) {
  const { auth } = await getCloudbaseApp();
  const result = await auth.signUp({ username, password });

  if (result?.error) {
    throw new Error(result.error.message || "用户名注册失败");
  }

  if (result?.data?.session) return getCurrentProgressUser();
  return signInProgressUser(username, password);
}

export async function signOutProgressUser() {
  if (!isCloudbaseConfigured()) return;
  clearStoredUsername();
  const { auth } = await getCloudbaseApp();
  await auth.signOut();
  cloudbaseClientPromise = null;
}

async function getCloudbaseClient() {
  if (!cloudbaseClientPromise) {
    cloudbaseClientPromise = initCloudbaseClient();
  }

  return cloudbaseClientPromise;
}

async function getCloudbaseApp() {
  registerCloudbaseModules();
  const app = cloudbase.init({
    env: cloudbaseConfig.env,
    region: cloudbaseConfig.region,
    accessKey: cloudbaseConfig.accessKey
  });

  return {
    app,
    auth: app.auth()
  };
}

async function migrateLocalDayCompletions(dateKey) {
  if (!isCloudbaseConfigured() || hasLocalMigrationMarker(dateKey)) return;

  const completedTasks = readLocalCompletionsForDate(dateKey);
  const entries = Object.entries(completedTasks);
  if (!entries.length) {
    markLocalMigrationDone(dateKey);
    return;
  }

  const { db, ownerId } = await getCloudbaseClient();
  const values = entries.map(([taskKey, completed]) => {
    const [categoryId, taskId] = taskKey.split(":");
    return {
      user_id: ownerId,
      date_key: dateKey,
      category_id: categoryId,
      task_id: taskId,
      completed: completed ? 1 : 0,
      updated_at: getMySQLDateTime()
    };
  });
  const { error } = await db.from(cloudbaseConfig.tableName).upsert(values, {
    onConflict: "user_id,date_key,category_id,task_id"
  });

  if (error) throw new Error(error.message || "旧完成记录迁移到 CloudBase MySQL 失败");
  markLocalMigrationDone(dateKey);
}

async function initCloudbaseClient() {
  const { app, auth } = await getCloudbaseApp();
  const user = await getAuthenticatedUser(auth);
  const ownerId = getUserId(user) || getStoredUsername();

  if (!ownerId) {
    throw new Error("CloudBase 尚未登录，无法确定当前用户");
  }

  return {
    app,
    db: app.mysql(),
    ownerId
  };
}

async function getAuthenticatedUser(auth) {
  const loginState = await auth.getLoginState();
  if (loginState?.user) return loginState.user;

  const userResult = await auth.getUser?.();
  if (userResult?.error) throw new Error(userResult.error.message || "CloudBase 用户信息读取失败");
  if (userResult?.data?.user) return userResult.data.user;

  const currentUser = auth.currentUser;
  if (currentUser) return currentUser;

  return null;
}

function getUserId(user) {
  return (
    user?.id ||
    user?.uid ||
    user?.sub ||
    user?.openid ||
    user?.open_id ||
    user?.customUserId ||
    user?.user_metadata?.uid ||
    user?.user_metadata?.username ||
    user?.username
  );
}

function getUserName(user) {
  return user?.username || getStoredUsername() || user?.name || user?.email || user?.phone_number || user?.uid || user?.id || "已登录用户";
}

function storeUsername(username) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("rulingo-cloudbase-username", username.trim());
}

function getStoredUsername() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("rulingo-cloudbase-username") || "";
}

function clearStoredUsername() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("rulingo-cloudbase-username");
}

function registerCloudbaseModules() {
  if (cloudbaseModulesRegistered) return;
  const registerAuth = resolveModuleFunction(authModule, "registerAuth");
  const registerMySQL = resolveModuleFunction(mysqlModule, "registerMySQL");

  registerCloudbaseModule(registerAuth, cloudbase);
  registerCloudbaseModule(registerMySQL, cloudbase);
  cloudbaseModulesRegistered = true;
}

function registerCloudbaseModule(registerModule, appModule) {
  try {
    registerModule(appModule);
  } catch (error) {
    if (isDuplicateComponentError(error)) return;
    throw error;
  }
}

function isDuplicateComponentError(error) {
  const message = typeof error?.message === "string" ? error.message : String(error || "");
  return message.includes("Duplicate component");
}

function resolveCloudbaseModule(moduleValue) {
  const candidates = [
    moduleValue,
    moduleValue?.default,
    moduleValue?.default?.default
  ];
  const resolved = candidates.find((candidate) => typeof candidate?.init === "function");

  if (!resolved) {
    throw new Error("CloudBase SDK 初始化模块加载失败");
  }

  return resolved;
}

function resolveModuleFunction(moduleValue, functionName) {
  const candidates = [
    moduleValue?.[functionName],
    moduleValue?.default?.[functionName],
    moduleValue?.default?.default?.[functionName]
  ];
  const resolved = candidates.find((candidate) => typeof candidate === "function");

  if (!resolved) {
    throw new Error(`CloudBase SDK ${functionName} 模块加载失败`);
  }

  return resolved;
}

function normalizeRows(rows) {
  return (rows || []).map((row) => ({
    dateKey: normalizeDateKey(row.date_key),
    categoryId: row.category_id,
    taskId: row.task_id,
    completed: Boolean(row.completed)
  }));
}

function recordsToCompletionMap(records) {
  return records.reduce((map, record) => {
    map[`${record.categoryId}:${record.taskId}`] = record.completed;
    return map;
  }, {});
}

function loadLocalRangeCompletions(startKey, endKey) {
  return getDateRangeKeys(startKey, endKey).flatMap((dateKey) => {
    const completedTasks = readLocalCompletionsForDate(dateKey);
    return Object.entries(completedTasks).map(([taskKey, completed]) => {
      const [categoryId, taskId] = taskKey.split(":");
      return {
        dateKey,
        categoryId,
        taskId,
        completed: Boolean(completed)
      };
    });
  });
}

function saveLocalTaskCompletion({ dateKey, categoryId, taskId, completed }) {
  const completedTasks = readLocalCompletionsForDate(dateKey);
  const next = {
    ...completedTasks,
    [`${categoryId}:${taskId}`]: completed
  };

  window.localStorage.setItem(getLocalCompletionStorageKey(dateKey), JSON.stringify(next));
}

function readLocalCompletionsForDate(dateKey) {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(getLocalCompletionStorageKey(dateKey));
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function getLocalCompletionStorageKey(dateKey) {
  return `daily-plan-completions:${dateKey}`;
}

function hasLocalMigrationMarker(dateKey) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(getLocalMigrationStorageKey(dateKey)) === "1";
}

function markLocalMigrationDone(dateKey) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getLocalMigrationStorageKey(dateKey), "1");
}

function getLocalMigrationStorageKey(dateKey) {
  return `daily-plan-completions-migrated:${dateKey}`;
}

function getDateRangeKeys(startKey, endKey) {
  const startDate = parseDateKey(startKey);
  const endDate = parseDateKey(endKey);
  if (!startDate || !endDate) return [];

  const first = startDate <= endDate ? startDate : endDate;
  const last = startDate <= endDate ? endDate : startDate;
  const dates = [];
  let cursor = new Date(first);

  while (cursor <= last) {
    dates.push(dateToKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function parseDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value) {
  if (value instanceof Date) return dateToKey(value);
  return String(value || "").slice(0, 10);
}

function getMySQLDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
