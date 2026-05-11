#!/usr/bin/env node

import { cp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const localConfigPath = resolve(rootDir, "scripts/cos-deploy.local.json");
const coscliConfigPath = resolve(rootDir, "scripts/.coscli.local.yaml");
const distDir = resolve(rootDir, "dist");
const dataDir = resolve(rootDir, "data");
const distDataDir = resolve(distDir, "data");
const args = new Set(process.argv.slice(2));

const prepareOnly = args.has("--prepare-only") || args.has("--no-upload");
const deleteRemote = args.has("--delete") || process.env.COS_DELETE === "1";

async function main() {
  const config = await loadLocalConfig();

  console.log("Building Umi app...");
  await run("npm", ["run", "build"]);

  await assertDirectory(distDir, "dist");
  await writeLegacyAssetAliases();

  if (existsSync(dataDir)) {
    console.log("Copying data/ into dist/data...");
    await rm(distDataDir, { recursive: true, force: true });
    await cp(dataDir, distDataDir, { recursive: true });
  }

  const target = getCosTarget(config);
  if (prepareOnly || !target) {
    console.log("Prepared dist/ for COS deployment.");
    if (!target) {
      console.log("Set COS_TARGET=cos://bucket-name[/prefix] or create scripts/cos-deploy.local.json to upload with coscli.");
    }
    return;
  }

  console.log(`Uploading dist/ to ${target}...`);
  const globalArgs = await getCoscliGlobalArgs(config);
  const syncArgs = ["sync", "dist/", target, "-r"];
  if (deleteRemote) {
    console.log("Warning: this coscli version does not support deleting remote-only files during sync.");
  }
  await run("coscli", [...globalArgs, ...syncArgs]);
  await run("coscli", [
    ...globalArgs,
    "cp",
    "dist/index.html",
    `${target}/index.html`,
    "--meta",
    "Cache-Control:no-cache"
  ]);

  console.log("COS deployment finished.");
}

async function loadLocalConfig() {
  if (!existsSync(localConfigPath)) return {};

  const rawConfig = await readFile(localConfigPath, "utf8");
  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    throw new Error(`Invalid JSON in ${localConfigPath}: ${error.message}`);
  }
}

function getCosTarget(config) {
  if (process.env.COS_TARGET) return trimTrailingSlash(process.env.COS_TARGET);
  if (config.target) return trimTrailingSlash(config.target);

  const bucket = process.env.COS_BUCKET || config.bucket;
  const prefix = process.env.COS_PREFIX || config.prefix || "";
  if (bucket) {
    const cleanPrefix = trimSlashes(prefix);
    return `cos://${bucket}${cleanPrefix ? `/${cleanPrefix}` : ""}`;
  }

  if (!process.env.COS_BUCKET) return "";

  return "";
}

async function getCoscliGlobalArgs(config) {
  const secretId = process.env.COS_SECRET_ID || config.secretId;
  const secretKey = process.env.COS_SECRET_KEY || config.secretKey;
  const endpoint = process.env.COS_ENDPOINT || config.endpoint;
  const token = process.env.COS_TOKEN || config.token;
  const configPath = process.env.COS_CONFIG_PATH || config.configPath || coscliConfigPath;

  await ensureFile(configPath);

  const globalArgs = ["--config-path", configPath];
  if (secretId) globalArgs.push("--secret-id", secretId);
  if (secretKey) globalArgs.push("--secret-key", secretKey);
  if (endpoint) globalArgs.push("--endpoint", endpoint);
  if (token) globalArgs.push("--token", token);

  return globalArgs;
}

async function ensureFile(path) {
  if (existsSync(path)) return;
  await writeFile(path, "", "utf8");
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

async function assertDirectory(path, label) {
  const info = await stat(path).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`Expected ${label}/ to exist after build.`);
  }
}

async function writeLegacyAssetAliases() {
  const files = await readdir(distDir);
  const aliases = [
    [/^umi\.[\da-f]+\.js$/, "umi.js"],
    [/^umi\.[\da-f]+\.css$/, "umi.css"],
    [/^preload_helper\.[\da-f]+\.js$/, "preload_helper.js"]
  ];

  for (const [pattern, alias] of aliases) {
    const source = files.find((file) => pattern.test(file));
    if (!source) continue;
    await cp(resolve(distDir, source), resolve(distDir, alias));
  }
}

function run(command, commandArgs) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(new Error(`${command} ${commandArgs.join(" ")} exited with code ${code}`));
    });
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
