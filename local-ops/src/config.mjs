import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const localOpsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const rootDir = resolve(localOpsDir, "..");

const localConfigPath = resolve(localOpsDir, "rulingo.local.json");
const legacyDailyPackConfigPath = resolve(rootDir, "scripts/cloudbase-daily-pack.local.json");

export async function loadRulingoLocalConfig() {
  loadDotEnv(resolve(rootDir, ".env"));

  const local = await readJsonIfExists(localConfigPath);
  const legacyDailyPack = await readJsonIfExists(legacyDailyPackConfigPath);
  const cloudbase = local.cloudbase || {};
  const tables = local.tables || {};

  return {
    cloudbase: {
      env: process.env.CLOUDBASE_ENV_ID || process.env.UMI_APP_CLOUDBASE_ENV_ID || cloudbase.env || local.env || "",
      region:
        process.env.CLOUDBASE_REGION ||
        process.env.UMI_APP_CLOUDBASE_REGION ||
        cloudbase.region ||
        local.region ||
        "ap-shanghai",
      accessKey:
        process.env.CLOUDBASE_ACCESS_KEY ||
        process.env.UMI_APP_CLOUDBASE_ACCESS_KEY ||
        cloudbase.accessKey ||
        local.accessKey ||
        "",
      authMode: process.env.CLOUDBASE_AUTH_MODE || cloudbase.authMode || local.authMode || "server",
      username: process.env.CLOUDBASE_USERNAME || cloudbase.username || local.username || legacyDailyPack.username || "",
      password: process.env.CLOUDBASE_PASSWORD || cloudbase.password || local.password || legacyDailyPack.password || "",
      owner: process.env.CLOUDBASE_OWNER || cloudbase.owner || local.owner || legacyDailyPack.owner || "",
      mysqlInstance: process.env.CLOUDBASE_MYSQL_INSTANCE || cloudbase.mysqlInstance || local.mysqlInstance || "default",
      mysqlDatabase: process.env.CLOUDBASE_MYSQL_DATABASE || cloudbase.mysqlDatabase || local.mysqlDatabase || ""
    },
    tables: {
      dailyPackSnapshots:
        process.env.CLOUDBASE_DAILY_PACK_TABLE ||
        tables.dailyPackSnapshots ||
        local.dailyPackSnapshotsTable ||
        legacyDailyPack.tableName ||
        "rulingo_daily_pack_snapshots",
      dailyPackResponses:
        process.env.CLOUDBASE_DAILY_PACK_RESPONSE_TABLE ||
        tables.dailyPackResponses ||
        local.dailyPackResponsesTable ||
        "rulingo_daily_pack_responses",
      memoryItems:
        process.env.CLOUDBASE_MEMORY_ITEMS_TABLE ||
        tables.memoryItems ||
        local.memoryItemsTable ||
        "rulingo_memory_items",
      memoryItemTags:
        process.env.CLOUDBASE_MEMORY_ITEM_TAGS_TABLE ||
        tables.memoryItemTags ||
        local.memoryItemTagsTable ||
        "rulingo_memory_item_tags"
    }
  };
}

export function assertCloudbaseConfig(config) {
  const cloudbase = config.cloudbase || {};
  if (!cloudbase.env) throw new Error("Missing CloudBase env. Set CLOUDBASE_ENV_ID or UMI_APP_CLOUDBASE_ENV_ID in the root .env.");
  if (!cloudbase.accessKey) {
    throw new Error("Missing CloudBase accessKey. Set CLOUDBASE_ACCESS_KEY or UMI_APP_CLOUDBASE_ACCESS_KEY in the root .env.");
  }
  if (!cloudbase.owner && !(cloudbase.username && cloudbase.password)) {
    throw new Error("Missing CloudBase owner or username/password. Configure cloudbase.username and cloudbase.password in local-ops/rulingo.local.json.");
  }
}

async function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return {};
  return JSON.parse(await readFile(filePath, "utf8"));
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");

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
