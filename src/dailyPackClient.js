import { cloudbaseConfig, isCloudbaseConfigured } from "./cloudbaseConfig.js";
import { getCloudbaseClient } from "./progressStore.js";

export async function loadDailyPackSnapshot(dateKey = "2026-05-13") {
  if (!isCloudbaseConfigured()) {
    const error = new Error("CloudBase 未配置，无法读取数据库里的今日练习。");
    error.code = "cloudbase_not_configured";
    throw error;
  }

  return loadCloudbaseDailyPackSnapshot(dateKey);
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
