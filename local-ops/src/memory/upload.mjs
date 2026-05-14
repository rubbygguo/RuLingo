import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCloudbaseContext } from "../cloudbase/client.mjs";
import { getMySQLDateTime, isEmptyJsonResponseError } from "../cloudbase/mysql.mjs";
import { rootDir } from "../config.mjs";

const allowedTypes = new Set([
  "word",
  "phrase",
  "sentence_pattern",
  "collocation",
  "grammar_point",
  "pronunciation",
  "topic_expression"
]);

export async function uploadMemoryItems(options = {}) {
  if (!options.file) throw new Error("Missing --file=path/to/memory-item.json.");

  const inputPath = resolve(rootDir, options.file);
  const rawInput = JSON.parse(await readFile(inputPath, "utf8"));
  const items = Array.isArray(rawInput) ? rawInput : rawInput.items || [rawInput];

  if (!items.length) throw new Error("Memory upload file does not contain any items.");

  const { db, ownerId: owner, config } = await getCloudbaseContext();
  const tableNames = {
    items: config.tables.memoryItems,
    tags: config.tables.memoryItemTags
  };

  const results = [];
  for (const item of items) {
    results.push(await upsertMemoryItem(db, tableNames, owner, item, options));
  }

  return {
    count: results.length,
    tableNames,
    results
  };
}

async function upsertMemoryItem(db, tableNames, owner, input, options) {
  const now = getMySQLDateTime();
  const proposed = normalizeMemoryInput(input, now, options);
  const existing = await findExistingItem(db, tableNames.items, owner, proposed.fingerprint);
  const itemId = existing?.id || proposed.id;
  const mergedDetails = mergeDetails(parseDetails(existing?.details), proposed.details);
  const mergedSearchText = buildSearchText({
    ...proposed,
    details: mergedDetails,
    tags: proposed.tags
  });

  const row = {
    id: itemId,
    owner: owner,
    type: proposed.type,
    canonical_text: proposed.canonicalText,
    display_text: proposed.displayText,
    normalized_text: proposed.normalizedText,
    fingerprint: proposed.fingerprint,
    base_form: proposed.baseForm || null,
    word_form: proposed.wordForm || null,
    meaning_zh: proposed.meaningZh || null,
    explanation_en: proposed.explanationEn || null,
    familiarity: existing?.familiarity || proposed.familiarity,
    is_archived: existing?.is_archived || 0,
    next_review_at: existing?.next_review_at || proposed.nextReviewAt,
    last_reviewed_at: existing?.last_reviewed_at || null,
    success_count: existing?.success_count || 0,
    fail_count: existing?.fail_count || 0,
    source_kind: proposed.sourceKind,
    first_seen_at: existing?.first_seen_at || proposed.firstSeenAt,
    last_seen_at: now,
    search_text: mergedSearchText,
    details: JSON.stringify(mergedDetails),
    updated_at: now
  };

  if (!existing) row.created_at = now;

  await upsertRow(db, tableNames.items, row, "owner,fingerprint");
  await upsertTags(db, tableNames.tags, owner, itemId, proposed.tags);

  return {
    id: itemId,
    fingerprint: proposed.fingerprint,
    canonicalText: proposed.canonicalText,
    action: existing ? "merged" : "created"
  };
}

function normalizeMemoryInput(input, now, options) {
  const type = normalizeType(input.type);
  const canonicalText = cleanText(input.canonicalText || input.canonical_text || input.text || input.rawText);
  if (!canonicalText) throw new Error("Memory item must include canonicalText or text.");

  const displayText = cleanText(input.displayText || input.display_text || canonicalText);
  const normalizedText = normalizeText(input.normalizedText || input.normalized_text || canonicalText);
  const fingerprint = input.fingerprint || buildFingerprint(type, normalizedText);
  const id = input.id || buildItemId(fingerprint);
  const details = normalizeDetails(input);
  const tags = normalizeTags(input.tags, type, input.sourceKind || input.source_kind);

  return {
    id,
    type,
    canonicalText,
    displayText,
    normalizedText,
    fingerprint,
    baseForm: cleanOptionalText(input.baseForm || input.base_form),
    wordForm: cleanOptionalText(input.wordForm || input.word_form),
    meaningZh: cleanOptionalText(input.meaningZh || input.meaning_zh),
    explanationEn: cleanOptionalText(input.explanationEn || input.explanation_en || input.explanation),
    familiarity: cleanOptionalText(input.familiarity) || "new",
    nextReviewAt: cleanOptionalText(input.nextReviewAt || input.next_review_at) || getTomorrowDateTime(),
    firstSeenAt: cleanOptionalText(input.firstSeenAt || input.first_seen_at) || now,
    sourceKind: cleanOptionalText(options.sourceKind || input.sourceKind || input.source_kind || details.source?.kind) || "chat",
    details,
    tags
  };
}

function normalizeType(type) {
  const value = cleanText(type);
  if (!allowedTypes.has(value)) {
    throw new Error(`Invalid memory item type "${type}". Expected one of: ${Array.from(allowedTypes).join(", ")}.`);
  }
  return value;
}

function normalizeDetails(input) {
  const details = {
    ...(typeof input.details === "object" && input.details ? input.details : {})
  };

  details.examples = normalizeStringArray(input.examples || details.examples);
  details.contexts = normalizeObjectArray(input.contexts || input.sourceContexts || details.contexts);
  details.mistakeNotes = normalizeObjectArray(input.mistakeNotes || details.mistakeNotes);

  const source = input.source || details.source;
  if (source && typeof source === "object") details.source = source;

  const userContext = cleanOptionalText(input.userContext || input.user_context);
  if (userContext) {
    details.contexts = mergeUniqueObjects(details.contexts, [{ text: userContext }]);
  }

  const mistakeNote = cleanOptionalText(input.mistakeNote || input.mistake_note);
  if (mistakeNote) {
    details.mistakeNotes = mergeUniqueObjects(details.mistakeNotes, [{ note: mistakeNote }]);
  }

  return details;
}

function normalizeTags(tags, type, sourceKind) {
  const values = [];
  values.push({ category: "type", tagKey: type, displayName: type });
  if (sourceKind) values.push({ category: "source", tagKey: normalizeTagKey(sourceKind), displayName: sourceKind });

  for (const tag of Array.isArray(tags) ? tags : []) {
    if (typeof tag === "string") {
      values.push({ category: "general", tagKey: normalizeTagKey(tag), displayName: tag });
      continue;
    }

    if (!tag || typeof tag !== "object") continue;
    const category = cleanOptionalText(tag.category) || "general";
    const tagKey = normalizeTagKey(tag.tagKey || tag.tag_key || tag.key || tag.name);
    const displayName = cleanOptionalText(tag.displayName || tag.display_name || tag.label || tag.name || tagKey);
    if (tagKey) values.push({ category, tagKey, displayName });
  }

  const seen = new Set();
  return values.filter((tag) => {
    const key = `${tag.category}:${tag.tagKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function findExistingItem(db, tableName, owner, fingerprint) {
  const { data, error } = await db
    .from(tableName)
    .select("*")
    .eq("owner", owner)
    .eq("fingerprint", fingerprint)
    .limit(1);

  if (error) throw new Error(error.message || "CloudBase MySQL memory lookup failed.");
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function upsertRow(db, tableName, row, onConflict) {
  const { error } = await db.from(tableName).upsert(row, { onConflict });
  if (error && !isEmptyJsonResponseError(error)) {
    throw new Error(error.message || `CloudBase MySQL upsert failed for ${tableName}.`);
  }
}

async function upsertTags(db, tableName, owner, itemId, tags) {
  if (!tags.length) return;

  const rows = tags.map((tag) => ({
    owner: owner,
    item_id: itemId,
    category: tag.category,
    tag_key: tag.tagKey,
    display_name: tag.displayName
  }));

  const { error } = await db.from(tableName).upsert(rows, {
    onConflict: "item_id,category,tag_key"
  });

  if (error && !isEmptyJsonResponseError(error)) {
    throw new Error(error.message || `CloudBase MySQL tag upsert failed for ${tableName}.`);
  }
}

function mergeDetails(existing, next) {
  return {
    ...existing,
    ...next,
    examples: mergeUniqueStrings(existing.examples, next.examples),
    contexts: mergeUniqueObjects(existing.contexts, next.contexts),
    mistakeNotes: mergeUniqueObjects(existing.mistakeNotes, next.mistakeNotes)
  };
}

function parseDetails(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function buildSearchText(item) {
  const parts = [
    item.canonicalText,
    item.displayText,
    item.meaningZh,
    item.explanationEn,
    item.baseForm,
    item.wordForm,
    ...item.tags.map((tag) => `${tag.category} ${tag.tagKey} ${tag.displayName}`),
    ...normalizeStringArray(item.details.examples),
    ...normalizeObjectArray(item.details.contexts).map((context) => Object.values(context).join(" ")),
    ...normalizeObjectArray(item.details.mistakeNotes).map((note) => Object.values(note).join(" "))
  ];

  return parts.filter(Boolean).join("\n");
}

function buildFingerprint(type, normalizedText) {
  return `${type}:${normalizedText.replace(/\s+/g, "_")}`;
}

function buildItemId(fingerprint) {
  const hash = createHash("sha1").update(fingerprint).digest("hex").slice(0, 12);
  return `mem_${hash}`;
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[“”"'.?!,:;()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTagKey(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanOptionalText(value) {
  const text = cleanText(value);
  return text || null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanOptionalText(item)).filter(Boolean);
}

function normalizeObjectArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object");
}

function mergeUniqueStrings(left = [], right = []) {
  return Array.from(new Set([...normalizeStringArray(left), ...normalizeStringArray(right)]));
}

function mergeUniqueObjects(left = [], right = []) {
  const values = [...normalizeObjectArray(left), ...normalizeObjectArray(right)];
  const seen = new Set();
  return values.filter((item) => {
    const key = JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTomorrowDateTime() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} 09:00:00`;
}
