#!/usr/bin/env node

import { parseArgs } from "./args.mjs";
import { fetchDailyPracticeContext } from "./daily-pack/fetch-practice-context.mjs";
import { uploadDailyPackSnapshot } from "./daily-pack/upload.mjs";
import { uploadMemoryItems } from "./memory/upload.mjs";

const { positional, options } = parseArgs(process.argv.slice(2));
const [domain, action] = positional;

try {
  if (domain === "daily-pack" && action === "upload") {
    const result = await withTimeout(uploadDailyPackSnapshot(options), "daily-pack upload");
    const suffix = result.verifiedAfterEmptyResponse ? " (verified after empty response)" : "";
    console.log(`Daily pack snapshot overridden: ${result.dateKey} -> ${result.tableName}${suffix}.`);
  } else if (domain === "daily-practice" && action === "fetch") {
    const result = await withTimeout(fetchDailyPracticeContext(options), "daily-practice fetch");
    console.log(JSON.stringify(result, null, 2));
  } else if (domain === "memory" && action === "upload") {
    const result = await withTimeout(uploadMemoryItems(options), "memory upload");
    const summary = result.results.map((item) => `${item.action}: ${item.canonicalText} (${item.fingerprint})`);
    console.log(`Memory items uploaded to ${result.tableNames.items}: ${result.count}`);
    console.log(summary.join("\n"));
  } else {
    printUsage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}

function printUsage() {
  console.log(`Usage:
  npm run daily-pack:upload -- --file=materials-system/daily-packs/YYYY-MM-DD/daily-pack-snapshot.json
  npm run daily-practice:fetch -- --date=today
  npm run memory:upload -- --file=local-ops/memory-item.example.json
  npm run local-ops -- daily-pack upload --file=materials-system/daily-packs/YYYY-MM-DD/daily-pack-snapshot.json
  npm run local-ops -- daily-practice fetch --date=YYYY-MM-DD
  npm run local-ops -- memory upload --file=local-ops/memory-item.example.json`);
}

function withTimeout(promise, label, timeoutMs = 30000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs / 1000}s while waiting for CloudBase.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
