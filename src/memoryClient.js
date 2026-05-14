import { cloudbaseConfig, isCloudbaseConfigured } from "./cloudbaseConfig.js";
import { getCloudbaseClient } from "./progressStore.js";

const memoryItemSelect = [
  "id",
  "type",
  "canonical_text",
  "display_text",
  "base_form",
  "word_form",
  "meaning_zh",
  "explanation_en",
  "source_kind",
  "last_seen_at",
  "search_text",
  "details"
].join(",");

export async function loadMemoryItems({ query = "", tagKey = "all" } = {}) {
  if (!isCloudbaseConfigured()) {
    const error = new Error("CloudBase 未配置，无法读取语言记忆库。");
    error.code = "cloudbase_not_configured";
    throw error;
  }

  const { db } = await getCloudbaseClient();
  const itemIds = tagKey && tagKey !== "all"
    ? await loadItemIdsByTag(db, tagKey)
    : null;

  if (itemIds && !itemIds.length) return [];

  let request = db
    .from(cloudbaseConfig.memoryItemsTableName)
    .select(memoryItemSelect)
    .eq("is_archived", 0)
    .order("last_seen_at", { ascending: false })
    .limit(80);

  if (itemIds) request = request.in("id", itemIds);

  const normalizedQuery = query.trim();
  if (normalizedQuery) {
    request = request.or(buildSearchFilter(normalizedQuery));
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message || "CloudBase MySQL 读取语言记忆库失败");

  const rows = Array.isArray(data) ? data : [];
  const tagsByItemId = await loadTagsForItems(db, rows.map((row) => row.id));
  return rows.map((row) => normalizeMemoryRow(row, tagsByItemId.get(row.id) || []));
}

export async function loadMemoryTagFilters() {
  if (!isCloudbaseConfigured()) return [{ key: "all", label: "全部" }];

  const { db } = await getCloudbaseClient();
  const { data, error } = await db
    .from(cloudbaseConfig.memoryItemTagsTableName)
    .select("category,tag_key,display_name")
    .order("category", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message || "CloudBase MySQL 读取语言记忆库标签失败");

  const seen = new Set();
  const tags = [{ key: "all", label: "全部" }];
  for (const row of Array.isArray(data) ? data : []) {
    const key = row.tag_key;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tags.push({ key, label: row.display_name || key });
  }

  return tags;
}

async function loadItemIdsByTag(db, tagKey) {
  const { data, error } = await db
    .from(cloudbaseConfig.memoryItemTagsTableName)
    .select("item_id")
    .eq("tag_key", tagKey)
    .limit(500);

  if (error) throw new Error(error.message || "CloudBase MySQL 按标签读取语言记忆库失败");
  return (Array.isArray(data) ? data : []).map((row) => row.item_id).filter(Boolean);
}

async function loadTagsForItems(db, itemIds) {
  const tagsByItemId = new Map();
  if (!itemIds.length) return tagsByItemId;

  const { data, error } = await db
    .from(cloudbaseConfig.memoryItemTagsTableName)
    .select("item_id,category,tag_key,display_name")
    .in("item_id", itemIds)
    .limit(500);

  if (error) throw new Error(error.message || "CloudBase MySQL 读取语言记忆库标签失败");

  for (const row of Array.isArray(data) ? data : []) {
    const tags = tagsByItemId.get(row.item_id) || [];
    tags.push({
      category: row.category,
      key: row.tag_key,
      label: row.display_name || row.tag_key
    });
    tagsByItemId.set(row.item_id, tags);
  }

  return tagsByItemId;
}

function normalizeMemoryRow(row, tags) {
  const details = parseJson(row.details) || {};

  return {
    id: row.id,
    type: row.type,
    canonicalText: row.canonical_text,
    displayText: row.display_text || row.canonical_text,
    baseForm: row.base_form,
    wordForm: row.word_form,
    meaningZh: row.meaning_zh,
    explanationEn: row.explanation_en,
    sourceKind: row.source_kind,
    lastSeenAt: row.last_seen_at,
    tags,
    examples: normalizeStringArray(details.examples),
    contexts: normalizeContextTexts(details.contexts),
    mistakeNotes: normalizeMistakeTexts(details.mistakeNotes)
  };
}

function buildSearchFilter(query) {
  const value = sanitizeSearchValue(query);
  const pattern = `%${value}%`;
  return [
    `canonical_text.like.${pattern}`,
    `display_text.like.${pattern}`,
    `meaning_zh.like.${pattern}`,
    `explanation_en.like.${pattern}`,
    `search_text.like.${pattern}`,
    `base_form.like.${pattern}`
  ].join(",");
}

function sanitizeSearchValue(value) {
  return String(value || "")
    .trim()
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ");
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeContextTexts(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item;
    return item?.text || item?.note || item?.contextText || "";
  }).map((item) => String(item).trim()).filter(Boolean);
}

function normalizeMistakeTexts(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item;
    return item?.note || item?.wrongText || item?.correctedText || "";
  }).map((item) => String(item).trim()).filter(Boolean);
}
