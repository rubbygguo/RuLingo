import { getCloudbaseContext } from "../cloudbase/client.mjs";
import { fetchCloudbaseRestRows } from "../cloudbase/rest.mjs";

export async function fetchDailyPracticeContext(options = {}) {
  const dateKey = normalizeDateOption(options.date || "today");
  const { app, auth, ownerId, config } = await getCloudbaseContext();
  const snapshot = await fetchDailyPackSnapshot(app, auth, config, config.tables.dailyPackSnapshots, ownerId, dateKey);
  const responses = await fetchDailyPackResponses(app, auth, config, config.tables.dailyPackResponses, ownerId, dateKey);

  return {
    date: dateKey,
    owner: ownerId,
    snapshot,
    responses,
    merged: snapshot?.packJson ? mergePracticeContext(snapshot.packJson, responses?.responseJson || {}) : null
  };
}

async function fetchDailyPackSnapshot(app, auth, config, tableName, ownerId, dateKey) {
  const data = await fetchCloudbaseRestRows(app, auth, config, tableName, {
    select: "id,date_key,schema_version,pack_json,generated_by,created_at,updated_at",
    owner: `eq.${ownerId}`,
    date_key: `eq.${dateKey}`,
    limit: 1
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    id: row.id,
    date: normalizeDateKey(row.date_key),
    schemaVersion: row.schema_version,
    generatedBy: row.generated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    packJson: parseJsonValue(row.pack_json)
  };
}

async function fetchDailyPackResponses(app, auth, config, tableName, ownerId, dateKey) {
  const data = await fetchCloudbaseRestRows(app, auth, config, tableName, {
    select: "id,date_key,response_json,created_at,updated_at",
    owner: `eq.${ownerId}`,
    date_key: `eq.${dateKey}`,
    limit: 1
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    id: row.id,
    date: normalizeDateKey(row.date_key),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responseJson: parseJsonValue(row.response_json) || {}
  };
}

function mergePracticeContext(pack, responses) {
  const tasks = [];
  const learningItems = [];
  const unitFeedback = [];

  for (const section of pack.sections || []) {
    for (const unit of section.units || []) {
      for (const task of unit.tasks || []) {
        const response = responses.tasks?.[task.id] || {};
        tasks.push({
          sectionId: section.id,
          sectionLabel: section.label,
          unitId: unit.id,
          unitTitle: unit.title,
          taskId: task.id,
          prompt: task.prompt,
          answerLabel: task.answerLabel || "回答",
          responseType: task.responseType || "",
          completed: Boolean(response.completed),
          answer: response.answer || "",
          updatedAt: response.updatedAt || null
        });
      }

      for (const item of unit.learningItems || []) {
        const response = responses.learningItems?.[item.id] || {};
        learningItems.push({
          sectionId: section.id,
          sectionLabel: section.label,
          unitId: unit.id,
          unitTitle: unit.title,
          itemId: item.id,
          type: item.type,
          text: item.text,
          meaning: item.meaning || "",
          sourceSentence: item.sourceSentence || "",
          status: response.status || "",
          note: response.note || "",
          updatedAt: response.updatedAt || null
        });
      }

      const feedback = responses.unitFeedback?.[unit.id];
      if (feedback?.freeNote) {
        unitFeedback.push({
          sectionId: section.id,
          sectionLabel: section.label,
          unitId: unit.id,
          unitTitle: unit.title,
          freeNote: feedback.freeNote,
          updatedAt: feedback.updatedAt || null
        });
      }
    }
  }

  return {
    packId: pack.id,
    date: pack.date,
    theme: pack.theme,
    summary: pack.summary,
    tasks,
    learningItems,
    unitFeedback
  };
}

function normalizeDateOption(value) {
  if (value === "today") return dateToKey(new Date());
  return String(value || "").slice(0, 10);
}

function normalizeDateKey(value) {
  if (value instanceof Date) return dateToKey(value);
  return String(value || "").slice(0, 10);
}

function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseJsonValue(value) {
  if (!value) return null;
  if (typeof value === "string") return JSON.parse(value);
  return value;
}
