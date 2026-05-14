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
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }
  ],
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
      path: "/memory",
      component: "./memory"
    },
    {
      path: "/login",
      component: "./login"
    }
  ]
});
