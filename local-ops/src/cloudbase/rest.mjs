import { spawn } from "node:child_process";

export async function fetchCloudbaseRestRows(app, auth, config, tableName, queryParams, options = {}) {
  const tokenResult = await auth.getAccessToken();
  const accessToken = tokenResult?.accessToken;
  if (!accessToken) throw new Error("CloudBase access token is unavailable after sign-in.");

  const { BASE_URL, PROTOCOL } = app.getEndPointWithKey("GATEWAY");
  const url = new URL(`${PROTOCOL}${BASE_URL}/rdb/rest/${encodeURIComponent(tableName)}`);
  for (const [key, value] of Object.entries(queryParams || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const stdout = await runCurlWithConfig(url.toString(), [
    ["header", `Authorization: Bearer ${accessToken}`],
    ["header", "Content-Type: application/json"],
    ["header", `X-Db-Instance: ${config.cloudbase.mysqlInstance || "default"}`],
    ["header", `Accept-Profile: ${config.cloudbase.mysqlDatabase || config.cloudbase.env}`],
    ["header", `Content-Profile: ${config.cloudbase.mysqlDatabase || config.cloudbase.env}`]
  ], options);

  if (!stdout.trim()) return [];
  return JSON.parse(stdout);
}

async function runCurlWithConfig(url, configEntries, options = {}) {
  const timeoutSeconds = String(options.timeoutSeconds || 20);
  const args = ["-sS", "--fail-with-body", "--max-time", timeoutSeconds, "-K", "-", url];
  const child = spawn("curl", args, { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.stdin.end(configEntries.map(([key, value]) => `${key} = ${quoteCurlConfigValue(value)}`).join("\n"));
  const code = await new Promise((resolve) => child.on("close", resolve));
  if (code !== 0) {
    throw new Error(`CloudBase REST query failed via curl. ${stderr || `curl exited with code ${code}`}`);
  }

  return stdout;
}

function quoteCurlConfigValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
