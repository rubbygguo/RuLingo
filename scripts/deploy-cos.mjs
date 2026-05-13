#!/usr/bin/env node

import { createHash, createHmac } from "node:crypto";
import { cp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import https from "node:https";

const rootDir = process.cwd();
const localConfigPath = resolve(rootDir, "scripts/cos-deploy.local.json");
const coscliConfigPath = resolve(rootDir, "scripts/.coscli.local.yaml");
const umiConfigPath = resolve(rootDir, ".umirc.js");
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

  await purgeCdnRoutes(config);

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

async function purgeCdnRoutes(config) {
  const domains = getCdnDomains(config);
  if (domains.length === 0) {
    console.log("Skipping CDN purge: set CDN_DOMAIN or cdnDomain in scripts/cos-deploy.local.json.");
    return;
  }

  const credentials = getCdnCredentials(config);
  if (!credentials.secretId || !credentials.secretKey) {
    console.log("Skipping CDN purge: missing CDN_SECRET_ID/CDN_SECRET_KEY or secretId/secretKey.");
    return;
  }

  const urls = await getCdnPurgeUrls(config, domains);
  if (urls.length === 0) {
    console.log("Skipping CDN purge: no Umi routes found.");
    return;
  }

  console.log(`Purging CDN cache for ${urls.length} route URL(s)...`);
  for (const batch of chunk(urls, 1000)) {
    await requestTencentCloudApi({
      endpoint: process.env.CDN_API_ENDPOINT || config.cdnApiEndpoint || "cdn.tencentcloudapi.com",
      service: "cdn",
      action: "PurgeUrlsCache",
      version: "2018-06-06",
      payload: { Urls: batch },
      credentials
    });
  }
  console.log(`CDN purge submitted: ${urls.join(", ")}`);
}

function getCdnDomains(config) {
  const value = process.env.CDN_DOMAINS || process.env.CDN_DOMAIN || config.cdnDomains || config.cdnDomain || "";
  const domains = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(domains.map((domain) => normalizeCdnDomain(domain)).filter(Boolean))];
}

function normalizeCdnDomain(domain) {
  return String(domain).trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function getCdnCredentials(config) {
  return {
    secretId: process.env.CDN_SECRET_ID || process.env.COS_SECRET_ID || config.cdnSecretId || config.secretId,
    secretKey: process.env.CDN_SECRET_KEY || process.env.COS_SECRET_KEY || config.cdnSecretKey || config.secretKey,
    token: process.env.CDN_TOKEN || process.env.COS_TOKEN || config.cdnToken || config.token
  };
}

async function getCdnPurgeUrls(config, domains) {
  const routePaths = await loadUmiRoutePaths();
  const extraUrls = getStringList(process.env.CDN_EXTRA_URLS || config.cdnExtraUrls);
  const protocol = process.env.CDN_PROTOCOL || config.cdnProtocol || "https";

  const routeUrls = domains.flatMap((domain) =>
    routePaths.map((routePath) => `${protocol}://${domain}${normalizeRoutePath(routePath)}`)
  );
  return [...new Set([...routeUrls, ...extraUrls])];
}

async function loadUmiRoutePaths() {
  if (!existsSync(umiConfigPath)) return ["/"];

  const configModule = await import(`${pathToFileURL(umiConfigPath).href}?t=${Date.now()}`);
  const routes = configModule.default?.routes || [];
  return routes
    .map((route) => route.path)
    .filter((routePath) => typeof routePath === "string")
    .filter((routePath) => routePath.startsWith("/"))
    .filter((routePath) => !routePath.includes(":") && !routePath.includes("*"));
}

function normalizeRoutePath(routePath) {
  if (routePath === "/") return "/";
  return `/${trimSlashes(routePath)}`;
}

function getStringList(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : String(value).split(",");
  return items.map((item) => item.trim()).filter(Boolean);
}

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function requestTencentCloudApi({ endpoint, service, action, version, payload, credentials }) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const hashedPayload = sha256Hex(body);
  const canonicalRequest = [
    "POST",
    "/",
    "",
    `content-type:application/json; charset=utf-8\nhost:${endpoint}\nx-tc-action:${action.toLowerCase()}\n`,
    "content-type;host;x-tc-action",
    hashedPayload
  ].join("\n");
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const secretDate = hmac(`TC3${credentials.secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmacHex(secretSigning, stringToSign);
  const authorization = [
    `TC3-HMAC-SHA256 Credential=${credentials.secretId}/${credentialScope}`,
    "SignedHeaders=content-type;host;x-tc-action",
    `Signature=${signature}`
  ].join(", ");

  const response = await postJson(endpoint, body, {
    Authorization: authorization,
    "Content-Type": "application/json; charset=utf-8",
    Host: endpoint,
    "X-TC-Action": action,
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Version": version,
    ...(credentials.token ? { "X-TC-Token": credentials.token } : {})
  });

  if (response.Response?.Error) {
    const { Code, Message } = response.Response.Error;
    throw new Error(`CDN purge failed: ${Code} - ${Message}`);
  }

  return response;
}

function postJson(endpoint, body, headers) {
  return new Promise((resolvePost, rejectPost) => {
    const request = https.request(
      {
        method: "POST",
        hostname: endpoint,
        path: "/",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunkData) => {
          raw += chunkData;
        });
        response.on("end", () => {
          try {
            const data = raw ? JSON.parse(raw) : {};
            if (response.statusCode && response.statusCode >= 400) {
              rejectPost(new Error(`Tencent Cloud API HTTP ${response.statusCode}: ${raw}`));
              return;
            }
            resolvePost(data);
          } catch (error) {
            rejectPost(new Error(`Invalid Tencent Cloud API response: ${error.message}`));
          }
        });
      }
    );

    request.on("error", rejectPost);
    request.write(body);
    request.end();
  });
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
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
