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
  title: "RuLingo",
  links: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }
  ],
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
      path: "/daily-pack",
      component: "./daily-pack"
    },
    {
      path: "/login",
      component: "./login"
    }
  ]
});
