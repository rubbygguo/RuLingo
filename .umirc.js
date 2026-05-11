import { defineConfig } from "@umijs/max";

export default defineConfig({
  base: "/",
  publicPath: "/",
  hash: true,
  history: { type: "browser" },
  mountElementId: "root",
  npmClient: "npm",
  jsMinifierOptions: {
    target: ["chrome80", "es2020"]
  },
  title: "英文提升学习系统",
  plugins: ["./plugins/localDataServer.js"],
  routes: [
    {
      path: "/",
      component: "./index"
    },
    {
      path: "/today",
      component: "./today"
    },
    {
      path: "/login",
      component: "./login"
    }
  ]
});
