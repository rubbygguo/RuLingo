import { cloudbaseConfig, isCloudbaseConfigured } from "./cloudbaseConfig.js";
import { getCloudbaseClient, getMySQLDateTime } from "./progressStore.js";

export async function loadDailyPackSnapshot(dateKey) {
  if (!isCloudbaseConfigured()) {
    const error = new Error("CloudBase 未配置，无法读取数据库里的今日练习。");
    error.code = "cloudbase_not_configured";
    throw error;
  }

  return loadCloudbaseDailyPackSnapshot(dateKey);
}

export async function loadDailyPackResponses(dateKey) {
  if (!isCloudbaseConfigured()) return loadLocalDailyPackResponses(dateKey);

  const { db, ownerId } = await getCloudbaseClient();
  const { data, error } = await db
    .from(cloudbaseConfig.dailyPackResponseTableName)
    .select("response_json,updated_at")
    .eq("owner", ownerId)
    .eq("date_key", dateKey)
    .limit(1);

  if (error) throw new Error(error.message || "CloudBase MySQL 读取今日作答记录失败");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { responses: {}, updatedAt: null };

  return {
    responses: parsePackJson(row.response_json) || {},
    updatedAt: row.updated_at || null
  };
}

export async function saveDailyPackResponses({ dateKey, packId, responses }) {
  const normalizedResponses = normalizeResponses({ packId, responses });

  if (!isCloudbaseConfigured()) {
    saveLocalDailyPackResponses(dateKey, normalizedResponses);
    return;
  }

  const { db, ownerId } = await getCloudbaseClient();
  const { error } = await db.from(cloudbaseConfig.dailyPackResponseTableName).upsert(
    {
      owner: ownerId,
      date_key: dateKey,
      response_json: JSON.stringify(normalizedResponses),
      updated_at: getMySQLDateTime()
    },
    {
      onConflict: "owner,date_key"
    }
  );

  if (error) throw new Error(error.message || "CloudBase MySQL 保存今日作答记录失败");
  saveLocalDailyPackResponses(dateKey, normalizedResponses);
}

async function loadCloudbaseDailyPackSnapshot(dateKey) {
  const { db, ownerId } = await getCloudbaseClient();
  const { data, error } = await db
    .from(cloudbaseConfig.dailyPackTableName)
    .select("id,date_key,schema_version,pack_json,generated_by,created_at,updated_at")
    .eq("owner", ownerId)
    .eq("date_key", dateKey)
    .limit(1);

  if (error) throw new Error(error.message || "CloudBase MySQL 读取今日练习失败");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    id: row.id,
    date: normalizeDateKey(row.date_key),
    schemaVersion: row.schema_version,
    generatedBy: row.generated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    packJson: parsePackJson(row.pack_json)
  };
}

function parsePackJson(value) {
  if (!value) return null;
  if (typeof value === "string") return JSON.parse(value);
  return value;
}

function normalizeDateKey(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || "").slice(0, 10);
}

function normalizeResponses({ packId, responses }) {
  const now = new Date().toISOString();
  return {
    schemaVersion: "daily_pack_response.v1",
    packId,
    tasks: responses?.tasks || {},
    learningItems: responses?.learningItems || {},
    unitFeedback: responses?.unitFeedback || {},
    meta: {
      ...(responses?.meta || {}),
      lastSavedAt: now
    }
  };
}

function loadLocalDailyPackResponses(dateKey) {
  if (typeof window === "undefined") return { responses: {}, updatedAt: null };

  try {
    const saved = window.localStorage.getItem(getLocalResponseStorageKey(dateKey));
    return {
      responses: saved ? JSON.parse(saved) : {},
      updatedAt: null
    };
  } catch {
    return { responses: {}, updatedAt: null };
  }
}

function saveLocalDailyPackResponses(dateKey, responses) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getLocalResponseStorageKey(dateKey), JSON.stringify(responses || {}));
}

function getLocalResponseStorageKey(dateKey) {
  return `rulingo:daily-pack:${dateKey}:responses`;
}
