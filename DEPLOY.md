# Deploying Gloamreach

The game is a static Vite build hosted for free on **GitHub Pages**. There is no
server — `npm run build` produces plain HTML/JS/CSS that GitHub serves.

- **Repo:** https://github.com/caprile/gloamreach
- **Live site:** https://caprile.github.io/gloamreach/
- **Branch that publishes:** `main` (pushing to it auto-deploys)

## How publishing works

A GitHub Actions workflow (`.github/workflows/deploy.yml`) rebuilds and republishes
the site **on every push to `main`**. You never build or upload manually — the cloud
does it (~1 minute per deploy). Friends just refresh the page to get the update.

The workflow only ships the game. The balancing dashboard (`dashboard.html`) is
intentionally excluded from the production build; it stays available locally at
`/dashboard.html` while `npm run dev` is running.

## The everyday loop

### 1. Work locally (private — nobody sees this)
```powershell
cd "$HOME\Desktop\VibeCoding\survivor-rpg"
npm run dev
```
Play/test at http://127.0.0.1:5173/. Edits hot-reload. Nothing here touches the
public site — it's all local until you push.

### 2. Ship a patch to the public game
From the same folder, when you're happy with the changes:
```powershell
git add -A
git commit -m "describe what changed"
git push
```
The push to `main` triggers the workflow → the live site updates in ~1 minute.

### Confirm it went live
- Check the run went green: https://github.com/caprile/gloamreach/actions
- Then hard-refresh the site (Ctrl+F5). Tell friends to hard-refresh too — browsers
  cache aggressively.

## Auth

Pushing uses **Git Credential Manager**, which caches your GitHub login in Windows
Credential Manager after the first successful push. You will **not** be prompted on
subsequent pushes (until the stored token expires, which is rare).

## Working with Claude Code on changes

- **Changes stay private until you explicitly ask to push.** Claude does not commit
  or push on its own.
- Describe changes normally to iterate locally (Claude verifies via build + preview).
- To publish, say something explicit: **"ship it" / "push this live" / "patch the
  public game."** Then Claude commits with a real message and pushes to `main`.
- Ask **"what's changed since the last push?"** to see the diff before it goes public.
- New system/mechanic → Claude will ask you to switch to **Opus** first. Fixes/tuning/
  small UI → **Sonnet** is fine.

## One-time setup that's already done (for reference)

- `vite.config.ts` uses `base: "./"` so assets resolve under the `/gloamreach/` subpath.
- Pages is enabled: repo **Settings → Pages → Source → GitHub Actions**.
- Remote `origin` → https://github.com/caprile/gloamreach.git, branch `main`.

## Troubleshooting

- **Site 404s ("There isn't a GitHub Pages site here"):** Pages Source isn't set to
  GitHub Actions, or the workflow hasn't succeeded yet. Check Settings → Pages and the
  Actions tab.
- **Workflow red X on the deploy step:** usually means Pages Source wasn't set to
  GitHub Actions. Set it, then re-run the workflow (Actions tab → the workflow →
  "Run workflow", or re-run the failed run).
- **Friends don't see the update:** they need a hard refresh (Ctrl+F5); the old build
  is cached in their browser.
- **localStorage note:** high scores / settings are per-browser, per-device. They do
  not sync between players or devices. Fine for casual playtesting.
