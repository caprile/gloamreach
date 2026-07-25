import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

// Dev-only bridge that lets code running in the page write a PNG to disk:
//
//   fetch('/__shot/art/rig/_wip/foo.png', { method: 'POST', body: <base64> })
//
// Verifying real art means LOOKING at what actually rendered — the art arc has
// already been bitten twice by art that passed every non-visual check (opaque
// decal backgrounds, warbow icons that were 4px wide). Canvas pixels can't
// otherwise leave the browser, and a WebGL context can't be read back with
// drawImage after the frame anyway, so this pairs with renderer.snapshotArea().
//
// `apply: "serve"` keeps it out of the production bundle entirely, and paths
// are confined to the project root.
function screenshotBridge(): Plugin {
  const root = process.cwd();
  return {
    name: "screenshot-bridge",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__shot", (req, res) => {
        const rel = decodeURIComponent((req.url ?? "").replace(/^\/+/, ""));
        const out = resolve(root, rel);
        if (req.method !== "POST" || !out.startsWith(root) || !out.endsWith(".png")) {
          res.statusCode = 400;
          return res.end("bad request");
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(c as Buffer));
        req.on("end", () => {
          mkdirSync(dirname(out), { recursive: true });
          writeFileSync(out, Buffer.from(Buffer.concat(chunks).toString("utf8"), "base64"));
          res.end("ok");
        });
      });
    },
  };
}

// Vite is our dev server + bundler. `npm run dev` serves the game with instant
// hot-reload; `npm run build` type-checks and produces an optimized build.
export default defineConfig({
  plugins: [screenshotBridge()],
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
