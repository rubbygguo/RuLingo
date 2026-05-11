const env = typeof process !== "undefined" ? process.env : {};

export const cloudbaseConfig = {
  env: env.UMI_APP_CLOUDBASE_ENV_ID || "",
  region: env.UMI_APP_CLOUDBASE_REGION || "ap-shanghai",
  accessKey: env.UMI_APP_CLOUDBASE_ACCESS_KEY || "",
  tableName: "rulingo_daily_task_completions",
  authMode: env.UMI_APP_CLOUDBASE_AUTH_MODE || "anonymous"
};

export function isCloudbaseConfigured() {
  return Boolean(cloudbaseConfig.env && cloudbaseConfig.accessKey);
}
