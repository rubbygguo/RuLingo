import { createRequire } from "node:module";
import { assertCloudbaseConfig, loadRulingoLocalConfig } from "../config.mjs";

const require = createRequire(import.meta.url);
const cloudbase = require("@cloudbase/js-sdk");

export async function getCloudbaseContext() {
  const config = await loadRulingoLocalConfig();
  assertCloudbaseConfig(config);
  const app = initCloudbaseApp(config);

  const auth = app.auth();
  const ownerId = config.cloudbase.owner || await resolveOwnerIdFromPasswordLogin(auth, config);

  return {
    app,
    auth,
    db: initRelationalDatabase(app, config),
    ownerId,
    config
  };
}

function initCloudbaseApp(config) {
  return cloudbase.init({
    env: config.cloudbase.env,
    region: config.cloudbase.region || "ap-shanghai",
    accessKey: config.cloudbase.accessKey
  });
}

function initRelationalDatabase(app, config) {
  const databaseOptions = {};
  if (config.cloudbase.mysqlInstance) databaseOptions.instance = config.cloudbase.mysqlInstance;
  if (config.cloudbase.mysqlDatabase) databaseOptions.database = config.cloudbase.mysqlDatabase;

  return Object.keys(databaseOptions).length ? app.rdb(databaseOptions) : app.rdb();
}

async function resolveOwnerIdFromPasswordLogin(auth, config) {
  const result = await auth.signInWithPassword({
    username: config.cloudbase.username,
    password: config.cloudbase.password
  });

  if (result?.error) {
    throw new Error(result.error.message || "CloudBase username/password sign-in failed while resolving owner.");
  }

  const loginState = await auth.getLoginState();
  const ownerId = getUserId(loginState?.user) || config.cloudbase.username;
  if (!ownerId) throw new Error("CloudBase sign-in succeeded but owner user id could not be resolved.");
  return ownerId;
}

function registerCloudbaseComponent(registerComponent) {
  try {
    registerComponent(cloudbase);
  } catch (error) {
    if (String(error?.message || error).includes("Duplicate component")) return;
    throw error;
  }
}

function getUserId(user) {
  return (
    user?.id ||
    user?.uid ||
    user?.sub ||
    user?.openid ||
    user?.open_id ||
    user?.customUserId ||
    user?.user_metadata?.uid ||
    user?.user_metadata?.username ||
    user?.username
  );
}
