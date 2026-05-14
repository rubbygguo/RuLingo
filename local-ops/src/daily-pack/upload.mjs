import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCloudbaseContext } from "../cloudbase/client.mjs";
import { getMySQLDateTime, isEmptyJsonResponseError } from "../cloudbase/mysql.mjs";
import { rootDir } from "../config.mjs";

const defaultSnapshotPath = resolve(rootDir, "materials-system/daily-packs/2026-05-13/daily-pack-snapshot.json");

export async function uploadDailyPackSnapshot(options = {}) {
  const snapshotPath = resolve(rootDir, options.file || defaultSnapshotPath);
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  const pack = snapshot.packJson || snapshot;
  const dateKey = options.date || snapshot.date || pack.date;

  if (!dateKey) throw new Error("Daily pack snapshot must include date or pass --date=YYYY-MM-DD.");

  const { db, ownerId, config } = await getCloudbaseContext();
  const tableName = config.tables.dailyPackSnapshots;
  const row = {
    owner: ownerId,
    date_key: dateKey,
    schema_version: snapshot.schemaVersion || "daily_pack_snapshot.v1",
    pack_json: JSON.stringify(pack),
    generated_by: snapshot.generatedBy || "codex",
    updated_at: getMySQLDateTime()
  };

  const { error } = await db.from(tableName).upsert(row, {
    onConflict: "owner,date_key"
  });

  if (error) {
    if (isEmptyJsonResponseError(error) && await hasUploadedSnapshot(db, tableName, ownerId, dateKey)) {
      return {
        dateKey,
        tableName,
        verifiedAfterEmptyResponse: true
      };
    }

    throw new Error(error.message || "CloudBase MySQL daily pack upsert failed.");
  }

  return {
    dateKey,
    tableName,
    verifiedAfterEmptyResponse: false
  };
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
