import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = process.cwd();
const dataDir = resolve(rootDir, "data");

function dataServerPlugin() {
  return {
    name: "local-data-server",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/data/")) {
          next();
          return;
        }

        const requestPath = decodeURIComponent(req.url.split("?")[0]);
        const filePath = resolve(rootDir, `.${requestPath}`);
        const isInsideData = filePath === dataDir || filePath.startsWith(`${dataDir}${sep}`);

        if (!isInsideData || !existsSync(filePath) || !statSync(filePath).isFile()) {
          next();
          return;
        }

        res.setHeader("Content-Type", contentType(filePath));
        createReadStream(filePath).pipe(res);
      });
    }
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".md")) return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}

export default defineConfig({
  plugins: [react(), dataServerPlugin()],
  build: {
    rollupOptions: {
      input: resolve(rootDir, "site/index.html")
    }
  },
  server: {
    port: 4173,
    strictPort: false
  }
});
