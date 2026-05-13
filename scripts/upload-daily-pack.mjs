#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cloudbase = require("@cloudbase/js-sdk");

const rootDir = process.cwd();
loadDotEnv(resolve(rootDir, ".env"));
const localConfigPath = resolve(rootDir, "scripts/cloudbase-daily-pack.local.json");
const defaultSnapshotPath = resolve(rootDir, "data/daily-packs/2026-05-13.json");
const args = parseArgs(process.argv.slice(2));
const snapshotPath = resolve(rootDir, args.file || defaultSnapshotPath);
const config = await loadConfig();

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const pack = snapshot.packJson || snapshot;
const dateKey = args.date || snapshot.date || pack.date;

if (!dateKey) throw new Error("Daily pack snapshot must include date or pass --date=YYYY-MM-DD.");
if (!config.env) throw new Error("Missing CloudBase env. Set CLOUDBASE_ENV_ID or scripts/cloudbase-daily-pack.local.json.");
if (!config.accessKey) throw new Error("Missing CloudBase accessKey. Set CLOUDBASE_ACCESS_KEY or local config.");
if (!(config.username && config.password)) {
  throw new Error("Missing username/password in local config. Owner is CloudBase-managed and requires signing in as the target user.");
}

const app = cloudbase.init({
  env: config.env,
  region: config.region || "ap-shanghai",
  accessKey: config.accessKey
});

const auth = app.auth();
const result = await auth.signInWithPassword({
  username: config.username,
  password: config.password
});
if (result?.error) throw new Error(result.error.message || "CloudBase username/password sign-in failed.");
const loginState = await auth.getLoginState();
const ownerId = config.owner || getUserId(loginState?.user) || config.username;

const db = app.mysql();
const tableName = config.tableName || "rulingo_daily_pack_snapshots";
const now = getMySQLDateTime();
const row = {
  owner: ownerId,
  date_key: dateKey,
  schema_version: snapshot.schemaVersion || "daily_pack_snapshot.v1",
  pack_json: JSON.stringify(pack),
  generated_by: snapshot.generatedBy || "codex",
  updated_at: now
};

const { error } = await db.from(tableName).upsert(row, {
  onConflict: "owner,date_key"
});

if (error) {
  if (isEmptyJsonResponseError(error) && await hasUploadedSnapshot(db, tableName, ownerId, dateKey)) {
    console.log(`Daily pack snapshot overridden: ${dateKey} -> ${tableName} (verified after empty response).`);
    process.exit(0);
  }

  throw new Error(error.message || "CloudBase MySQL daily pack upsert failed.");
}

console.log(`Daily pack snapshot overridden: ${dateKey} -> ${tableName} (override by owner,date_key).`);

async function loadConfig() {
  const local = existsSync(localConfigPath)
    ? JSON.parse(await readFile(localConfigPath, "utf8"))
    : {};

  return {
    env: process.env.CLOUDBASE_ENV_ID || process.env.UMI_APP_CLOUDBASE_ENV_ID || local.env || "",
    region: process.env.CLOUDBASE_REGION || process.env.UMI_APP_CLOUDBASE_REGION || local.region || "ap-shanghai",
    accessKey: process.env.CLOUDBASE_ACCESS_KEY || process.env.UMI_APP_CLOUDBASE_ACCESS_KEY || local.accessKey || "",
    tableName: process.env.CLOUDBASE_DAILY_PACK_TABLE || local.tableName || "rulingo_daily_pack_snapshots",
    owner: process.env.CLOUDBASE_DAILY_PACK_OWNER || local.owner || "",
    username: process.env.CLOUDBASE_USERNAME || local.username || "",
    password: process.env.CLOUDBASE_PASSWORD || local.password || ""
  };
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const content = require("fs").readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function parseArgs(values) {
  return values.reduce((parsed, item) => {
    const [key, ...rest] = item.replace(/^--/, "").split("=");
    parsed[key] = rest.join("=") || true;
    return parsed;
  }, {});
}

async function hasUploadedSnapshot(db, tableName, ownerId, dateKey) {
  const { data, error } = await db
    .from(tableName)
    .select("date_key")
    .eq("owner", ownerId)
    .eq("date_key", dateKey)
    .limit(1);

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

function isEmptyJsonResponseError(error) {
  return String(error?.message || error).includes("Unexpected end of JSON input");
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
