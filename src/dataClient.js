const DATA_ROOT = "/data";

export async function loadLearningData() {
  const [
    settings,
    taxonomy,
    routines,
    weekly,
    milestones,
    dailyPlan,
    materialsIndex,
    expressionIndex,
    practicesIndex,
    writingsIndex,
    checkinTemplates
  ] = await Promise.all([
    getJSON(`${DATA_ROOT}/meta/settings.json`),
    getJSON(`${DATA_ROOT}/meta/taxonomy.json`),
    getJSON(`${DATA_ROOT}/plans/routines.json`),
    getJSON(`${DATA_ROOT}/plans/weekly.json`),
    getJSON(`${DATA_ROOT}/plans/milestones.json`),
    getJSON(`${DATA_ROOT}/plans/daily/2026-05-11.json`),
    getJSON(`${DATA_ROOT}/materials/index.json`),
    getJSON(`${DATA_ROOT}/expressions/index.json`),
    getJSON(`${DATA_ROOT}/practices/index.json`),
    getJSON(`${DATA_ROOT}/writings/index.json`),
    getJSON(`${DATA_ROOT}/checkins/templates.json`)
  ]);

  const expressionFiles = await Promise.all(
    expressionIndex.files.map((file) => getJSON(`${DATA_ROOT}/expressions/${file}`))
  );

  const materials = await Promise.all(
    materialsIndex.materials.map(async (material) => ({
      ...material,
      content: await getText(`${DATA_ROOT}/materials/${material.contentFile}`)
    }))
  );

  return {
    settings,
    taxonomy,
    routines: routines.routines,
    weekly: weekly.items,
    milestones: milestones.milestones,
    dailyPlan,
    materials,
    expressions: expressionFiles.flatMap((file) =>
      file.expressions.map((expression) => ({ ...expression, category: file.category }))
    ),
    practices: practicesIndex.practices,
    writingGuidance: writingsIndex.guidance,
    writings: writingsIndex.writings,
    checkinTemplates: checkinTemplates.templates
  };
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${url}`);
  return response.json();
}

async function getText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${url}`);
  return response.text();
}
