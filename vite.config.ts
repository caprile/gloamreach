import { defineConfig } from "vite";
import { resolve } from "node:path";

// Vite is our dev server + bundler. `npm run dev` serves the game with instant
// hot-reload; `npm run build` type-checks and produces an optimized build.
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    // Two entry points: the game (index.html) and the balancing dashboard
    // (dashboard.html, /src/dashboard) — a dev-only reference page that imports
    // the live data modules. Without listing both, `vite build` would only bundle
    // index.html and silently drop the dashboard.
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
      },
    },
  },
});
