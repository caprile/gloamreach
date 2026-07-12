import { defineConfig } from "vite";

// Vite is our dev server + bundler. `npm run dev` serves the game with instant
// hot-reload; `npm run build` type-checks and produces an optimized build.
export default defineConfig({
  // Relative asset paths so the production build works when served from a
  // subpath (e.g. GitHub Pages at /<repo-name>/), not just the domain root.
  // The game is a single page with no client-side routing, so relative base is
  // safe and avoids hardcoding the repo name.
  base: "./",
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT) || 5173,
  },
  // NOTE: the balancing dashboard (dashboard.html, /src/dashboard) is a dev-only
  // reference page. It is intentionally NOT listed as a build input, so the
  // production build (and the public playtest deploy) ships only the game. It
  // still works during `npm run dev` — Vite's dev server serves any root HTML
  // file regardless of the build inputs — reachable at /dashboard.html.
});
