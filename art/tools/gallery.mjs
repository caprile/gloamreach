// Build the art reference gallery as a single self-contained HTML file.
//
// Every sprite is inlined as a data URI: the published page runs under a CSP
// that blocks external hosts, so a linked image would silently render nothing.
//
// Usage: node art/tools/gallery.mjs <out.html>

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ICON_DIR = "art/sprites";
const WORLD_DIR = "art/sprites/world";

function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function load(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .map((f) => {
      const buf = readFileSync(join(dir, f));
      const { w, h } = pngSize(buf);
      return { key: f.replace(/\.png$/, ""), w, h, data: buf.toString("base64") };
    });
}

// Icons are grouped by what the player does with them, not by how the code
// stores them — this page is read while deciding whether a set hangs together.
const ICON_GROUPS = [
  ["Weapons", /sword|pike|warhammer|warbow|club|knife|spear|brand|javelin|slingshot|arrow|pellet|axe|pickaxe/],
  ["Armor", /helm|cuirass|greaves|hood|vest|leggings|cap|shirt|pants/],
  ["Ores & ingots", /ingot|_ore|shard|clay|moonsilver|hex_essence/],
  ["Raw materials", /wood|stone|leather|bones|twine|ironbark|mirehide|skin|guck|blood|plate|pelt|chitin|gland|dust|gorge_bone/],
  ["Food & flora", /meat|berry|cattail|sunfruit|emberbloom|dustbloom|gloamcap|moss|lily|shishkabob|cooked|skewer|feast|broth|ribs|steak|tail|mirejaw/],
  ["Relics & trophies", /relic|trophy|fang|heart|sigil|totem|fetish|rubbing/],
  ["Jewelry & abilities", /amulet|ring_|cloak|gem_|gloamdrinker/],
  ["Stations", /workbench|campfire|drying_rack|smelter|forge|jewelry_station|comfort/],
  ["Status", /status_/],
];

function groupOf(key) {
  const name = key.replace(/^icon_/, "");
  for (const [label, re] of ICON_GROUPS) if (re.test(name)) return label;
  return "Other";
}

const icons = load(ICON_DIR);
const world = load(WORLD_DIR);

const sections = [];
const byGroup = new Map();
for (const it of icons) {
  const g = groupOf(it.key);
  if (!byGroup.has(g)) byGroup.set(g, []);
  byGroup.get(g).push(it);
}
if (world.length) sections.push({ title: "World props", kind: "world", items: world });
for (const [label] of ICON_GROUPS) if (byGroup.has(label)) sections.push({ title: label, kind: "icon", items: byGroup.get(label) });
if (byGroup.has("Other")) sections.push({ title: "Other", kind: "icon", items: byGroup.get("Other") });

const card = (it) => `<figure class="cell" data-key="${it.key}">
<div class="plate"><img src="data:image/png;base64,${it.data}" alt="${it.key}" width="${it.w}" height="${it.h}"></div>
<figcaption><span class="k">${it.key}</span><span class="d">${it.w}×${it.h}</span></figcaption>
</figure>`;

const body = sections
  .map(
    (s) => `<section class="grp" data-title="${s.title}">
<h2>${s.title}<span class="n">${s.items.length}</span></h2>
<div class="grid">${s.items.map(card).join("")}</div>
</section>`,
  )
  .join("\n");

const html = `<title>Gloamreach — Art Reference</title>
<style>
:root{
  --ink:#12150f; --ink-2:#3d4436; --rule:#cdd2c4; --ground:#eef0e7; --plate:#e2e6d8;
  --accent:#6d4fa8; --ember:#a8562a; --sans:ui-sans-serif,"Segoe UI",system-ui,sans-serif;
  --mono:ui-monospace,"Cascadia Mono",Consolas,monospace;
}
@media (prefers-color-scheme:dark){
  :root{ --ink:#e6e9de; --ink-2:#9aa392; --rule:#2c3328; --ground:#12150f; --plate:#1b1f18; --accent:#a98cf0; --ember:#d9814d; }
}
:root[data-theme="dark"]{ --ink:#e6e9de; --ink-2:#9aa392; --rule:#2c3328; --ground:#12150f; --plate:#1b1f18; --accent:#a98cf0; --ember:#d9814d; }
:root[data-theme="light"]{ --ink:#12150f; --ink-2:#3d4436; --rule:#cdd2c4; --ground:#eef0e7; --plate:#e2e6d8; --accent:#6d4fa8; --ember:#a8562a; }

*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);line-height:1.5}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px 80px}

header{padding:44px 0 20px;border-bottom:1px solid var(--rule)}
h1{margin:0;font-size:clamp(26px,4vw,38px);letter-spacing:-.02em;text-wrap:balance}
h1 em{font-style:normal;color:var(--accent)}
.sub{margin:8px 0 0;color:var(--ink-2);max-width:62ch}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;font-family:var(--mono);font-size:12px}
.stat{border:1px solid var(--rule);padding:4px 9px;color:var(--ink-2)}
.stat b{color:var(--ink);font-variant-numeric:tabular-nums}

.bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px;align-items:center;
  padding:12px 0;background:var(--ground);border-bottom:1px solid var(--rule)}
input[type=search]{flex:1 1 220px;min-width:0;background:transparent;border:1px solid var(--rule);
  color:var(--ink);font-family:var(--mono);font-size:13px;padding:7px 10px}
input[type=search]:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.zoom{display:flex;gap:0;border:1px solid var(--rule)}
.zoom button{background:transparent;border:0;border-right:1px solid var(--rule);color:var(--ink-2);
  font-family:var(--mono);font-size:12px;padding:7px 11px;cursor:pointer}
.zoom button:last-child{border-right:0}
.zoom button[aria-pressed=true]{background:var(--accent);color:var(--ground)}
.count{font-family:var(--mono);font-size:12px;color:var(--ink-2);font-variant-numeric:tabular-nums}

.grp{margin-top:38px}
.grp h2{display:flex;align-items:baseline;gap:10px;margin:0 0 14px;font-size:13px;
  text-transform:uppercase;letter-spacing:.1em;color:var(--ink-2);font-weight:600}
.grp h2::after{content:"";flex:1;height:1px;background:var(--rule)}
.grp .n{font-family:var(--mono);font-size:12px;color:var(--accent);font-variant-numeric:tabular-nums}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cell,124px),1fr));gap:12px}
.cell{margin:0;border:1px solid var(--rule);background:var(--plate);display:flex;flex-direction:column}
.plate{display:grid;place-items:center;padding:12px;min-height:var(--plate-h,92px);
  background-image:linear-gradient(45deg,rgba(128,128,128,.12) 25%,transparent 25%,transparent 75%,rgba(128,128,128,.12) 75%),
                   linear-gradient(45deg,rgba(128,128,128,.12) 25%,transparent 25%,transparent 75%,rgba(128,128,128,.12) 75%);
  background-size:12px 12px;background-position:0 0,6px 6px}
.plate img{image-rendering:pixelated;transform:scale(var(--z,2));transform-origin:center}
figcaption{border-top:1px solid var(--rule);padding:6px 8px;display:flex;flex-direction:column;gap:1px}
.k{font-family:var(--mono);font-size:11px;word-break:break-all;line-height:1.35}
.d{font-family:var(--mono);font-size:10px;color:var(--ink-2);font-variant-numeric:tabular-nums}
[hidden]{display:none!important}
.empty{color:var(--ink-2);font-family:var(--mono);font-size:13px;padding:40px 0}
@media (prefers-reduced-motion:no-preference){.cell{transition:border-color .12s}}
.cell:hover{border-color:var(--accent)}
</style>

<div class="wrap">
<header>
  <h1>Gloamreach — <em>Art Reference</em></h1>
  <p class="sub">Every real pixel-art asset currently overriding a generated placeholder. Drop a PNG named after a Phaser texture key into <code>art/sprites/</code> and it replaces that texture — this page is the record of what has been replaced so far.</p>
  <div class="stats">
    <span class="stat">Icons <b>${icons.length}</b></span>
    <span class="stat">World props <b>${world.length}</b></span>
    <span class="stat">Total <b>${icons.length + world.length}</b> of <b>377</b></span>
  </div>
</header>

<div class="bar">
  <input type="search" id="q" placeholder="filter by key — try 'sword', 'gloam', 'decor'" aria-label="Filter assets by texture key">
  <div class="zoom" role="group" aria-label="Zoom">
    <button data-z="1">×1</button><button data-z="2" aria-pressed="true">×2</button><button data-z="4">×4</button>
  </div>
  <span class="count" id="count"></span>
</div>

${body}
<p class="empty" id="empty" hidden>Nothing matches that filter.</p>
</div>

<script>
const cells=[...document.querySelectorAll('.cell')];
const groups=[...document.querySelectorAll('.grp')];
const q=document.getElementById('q'),count=document.getElementById('count'),empty=document.getElementById('empty');
function apply(){
  const t=q.value.trim().toLowerCase();
  let shown=0;
  for(const c of cells){const hit=!t||c.dataset.key.toLowerCase().includes(t);c.hidden=!hit;if(hit)shown++;}
  for(const g of groups)g.hidden=![...g.querySelectorAll('.cell')].some(c=>!c.hidden);
  empty.hidden=shown>0;
  count.textContent=shown+' shown';
}
q.addEventListener('input',apply);
document.querySelectorAll('.zoom button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.zoom button').forEach(o=>o.setAttribute('aria-pressed',String(o===b)));
  const z=+b.dataset.z;
  document.documentElement.style.setProperty('--z',z);
  document.documentElement.style.setProperty('--cell',(z>=4?168:z===1?104:124)+'px');
  document.documentElement.style.setProperty('--plate-h',(z>=4?150:z===1?70:92)+'px');
}));
apply();
</script>`;

const out = process.argv[2] || "art/gallery.html";
writeFileSync(out, html);
console.log(`${out}: ${icons.length} icons + ${world.length} world props`);
