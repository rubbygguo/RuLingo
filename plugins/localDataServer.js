import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

export default (api) => {
  const dataDir = resolve(api.cwd, "data");

  api.addMiddlewares(() => [
    (req, res, next) => {
      if (!req.url?.startsWith("/data/")) {
        next();
        return;
      }

      const requestPath = decodeURIComponent(req.url.split("?")[0]);
      const filePath = resolve(api.cwd, `.${requestPath}`);
      const isInsideData = filePath === dataDir || filePath.startsWith(`${dataDir}${sep}`);

      if (!isInsideData || !existsSync(filePath) || !statSync(filePath).isFile()) {
        next();
        return;
      }

      res.setHeader("Content-Type", contentType(filePath));
      createReadStream(filePath).pipe(res);
    }
  ]);
};

function contentType(filePath) {
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".md")) return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}
