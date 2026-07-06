import { defineConfig } from "vite";

// Vite is our dev server + bundler. `npm run dev` serves the game with instant
// hot-reload; `npm run build` type-checks and produces an optimized build.
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
