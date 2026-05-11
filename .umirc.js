import { defineConfig } from "@umijs/max";

export default defineConfig({
  base: "/site/",
  publicPath: "/",
  history: { type: "browser" },
  mountElementId: "root",
  npmClient: "npm",
  title: "英文提升学习系统",
  plugins: ["./plugins/localDataServer.js"],
  routes: [
    {
      path: "/",
      component: "./index"
    }
  ]
});
