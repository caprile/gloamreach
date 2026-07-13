// Balancing Dashboard — a standalone reference/analysis page for recipes,
// items, weapons, armor, relics, and enemy combat math. Served as a second
// Vite entry (dashboard.html), it imports the SAME source-of-truth data
// modules the game does, so it never drifts the way the hand-maintained
// RECIPES.md does. Open it at /dashboard.html while `npm run dev` is running.
//
// Deliberately framework-free plain DOM — this is a dev tool, not shipped game
// UI, and pulling in a UI framework would be the only npm dependency in the
// project. No item icons: those are Phaser-generated at runtime (BootScene),
// unavailable to a static page, so tables are text-only.

import { RECIPES, type Recipe, isPlaceableRecipe } from "../systems/Recipes";
import { ITEM_DEFS, itemDef, type ItemDef } from "../systems/Items";
import {
  weaponDamage,
  weaponCooldownMs,
  weaponStaminaCost,
  weaponAttacksPerSecond,
  weaponPrimaryDamageType,
  weaponBaseCritChance,
  weaponBaseCritMult,
  damageTypeDisplayName,
  type WeaponType,
} from "../systems/Weapons";
import { WEAPON_UPGRADES, weaponTierDamageBonus } from "../systems/WeaponUpgrades";
import { ARMOR_UPGRADES, armorDefenseForTier } from "../systems/ArmorUpgrades";
import { STATION_UPGRADES } from "../systems/StationUpgrades";
import { PROCESS_RECIPES } from "../systems/Processing";
import { COOK_RECIPES } from "../systems/Cooking";
import {
  RELIC_DEFS,
  RELIC_RARITIES,
  RELIC_POOLS,
  rarityName,
  rarityHex,
  PITY_THRESHOLD,
  TROPHY_OUTCOME_ODDS,
  trophyOverallSuccessChance,
  relicEffectText,
  TROPHY_ROLL,
  REFINE_RECIPES,
} from "../systems/Relics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAYER_BASE_HP = 100; // Health.ts MAX_HEALTH
const PLAYER_BASE_STAMINA = 100; // Stamina.ts MAX_STAMINA

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Pretty display name for any item/resource key, falling back to a title-cased
// version of the raw key when no ItemDef exists.
function name(key: string): string {
  const def = itemDef(key);
  if (def) return def.name;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettify(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// "4× Wood, 4× Stone" from a costs record.
function costsText(costs: Record<string, number | undefined>): string {
  const parts = Object.entries(costs)
    .filter(([, n]) => n)
    .map(([k, n]) => `${n}× ${name(k)}`);
  return parts.length ? parts.join(", ") : "—";
}

function tierTag(tier: number): string {
  return tier >= 1
    ? `<span class="tag tier1">Tier ${tier} · Workbench</span>`
    : `<span class="tag">Tier 0 · anywhere</span>`;
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

// ---------------------------------------------------------------------------
// Enemy combat stats — MANUALLY MIRRORED from the entity files (Boar.ts,
// Snake.ts, Gremlin.ts, GremlinKing.ts). These live inside Phaser sprite
// subclasses, not exported data tables, so unlike everything else on this page
// they are not imported live. Keep in sync when tuning an enemy. Elite variants
// apply +50% HP/dmg, +10% speed, ~1.3-1.4x scale, 2x loot, + a species trophy.
// ---------------------------------------------------------------------------

interface EnemyAttack {
  label: string;
  damage: number;
  telegraphMs?: number; // souls-like readable window (boss only today)
  // Elite variants deal +50% on most attacks, but a few use a fixed constant
  // that isn't elite-scaled in code (the Gremlin's rock projectile uses a flat
  // PROJECTILE_DAMAGE). Default true; set false for those.
  eliteScales?: boolean;
}
interface EnemyStat {
  name: string;
  hp: number;
  speed: number; // px/s primary aggressive movement
  aggro: number; // px
  attacks: EnemyAttack[];
  loot: string;
  trophy?: string;
  notes?: string;
}

const ELITE_MULT = 1.5;

const ENEMIES: EnemyStat[] = [
  {
    name: "Boar",
    hp: 20,
    speed: 60,
    aggro: 120,
    attacks: [
      { label: "Charge (locked line, overshoots)", damage: 25, telegraphMs: 620 },
      { label: "Gore bite (point-blank)", damage: 25, telegraphMs: 260 },
    ],
    loot: "1 Boar Meat, 1-2 Bones",
    trophy: "Boar Trophy (elite)",
    notes: "Souls-like: telegraphed committed charge (sidestep-dodgeable) + gore bite, long recovery punish window.",
  },
  {
    name: "Snake",
    hp: 11,
    speed: 90,
    aggro: 45,
    attacks: [{ label: "Coil → lunge (locked dir)", damage: 20, telegraphMs: 340 }],
    loot: "1 Leather Scraps, 1 Snake Meat",
    trophy: "Snake Trophy (elite)",
    notes: "Hidden ambusher: coil wind-up → locked lunge → flee/re-hide. Tight 45px trigger.",
  },
  {
    name: "Gremling (melee)",
    hp: 12,
    speed: 70,
    aggro: 110,
    attacks: [{ label: "Claw", damage: 12 }],
    loot: "1 Gremlin Blood",
    trophy: "Gremlin Trophy (elite)",
    notes: "Telegraphed claw (wind-up → strike → recover).",
  },
  {
    name: "Gremlin (ranged)",
    hp: 32,
    speed: 70,
    aggro: 136,
    attacks: [
      { label: "Rock (projectile, 220px)", damage: 11, eliteScales: false },
      { label: "Claw (melee, telegraphed)", damage: 15 },
    ],
    loot: "1 Gremlin Skin, 1 Gremlin Blood",
    trophy: "Gremlin Trophy (elite)",
    notes: "Kites + 2-shot bursts; commits to melee when cornered.",
  },
  {
    name: "Duskrunner (BADLANDS)",
    hp: 20,
    speed: 92,
    aggro: 160,
    attacks: [
      { label: "Pounce (locked leap, 190px band, 32px hit)", damage: 20, telegraphMs: 260 },
      { label: "Bite (point-blank fallback, 30px reach)", damage: 20, telegraphMs: 200 },
    ],
    loot: "1 Duskrunner Pelt",
    trophy: "Duskrunner Trophy (elite)",
    notes: "Biome 2 canid swarm. Fast, low-HP. Signature POUNCE gap-closer (sidestep-dodgeable) + point-blank bite. Pack-aggro (radius 260) — an aggro'd runner wakes packmates; spawns in packs of 3-4 AND rallies packmates to pounce together (attack-sync). Neutral resists (the AOE-arc payoff enemy). Reach/damage bumped 2026-07-12 (bite was whiffing on diagonals + doing 1 dmg in max armor).",
  },
  {
    name: "Cragscale (BADLANDS)",
    hp: 60,
    speed: 40,
    aggro: 130,
    attacks: [
      { label: "Rolling charge (300px/s, 40px hit, +BLEED 5/s×4s)", damage: 22, telegraphMs: 560 },
      { label: "Heavy basher (point-blank + 180 shove)", damage: 22, telegraphMs: 520 },
    ],
    loot: "1-2 Cragscale Plate",
    trophy: "Cragscale Trophy (elite)",
    notes: "Biome 2 armored bruiser (tanky, slow). Signature ROLLING CHARGE closes on kiters + a point-blank basher. Roll reworked 2026-07-12: faster (240→300) + wider (30→40px hit) so it forces a real dash/dodge, and a connect opens a BLEED wound (5/s for 4s, stacks) + 230 shove — the heavy must-dodge threat vs the Duskrunner's light pounce. Resist profile: slash ×0.5, blunt ×1.0, pierce ×1.6 — teaches the damage-type layer (Primal Spear shreds it, blades bounce).",
  },
  {
    name: "Hexling (BADLANDS)",
    hp: 55,
    speed: 46,
    aggro: 170,
    attacks: [
      { label: "Hex bolt (projectile 250px, BYPASSES armor)", damage: 14, eliteScales: false },
      { label: "Flame Strike (3 delayed magic AoE circles, 48px, close-range)", damage: 18, telegraphMs: 820 },
    ],
    loot: "1 Hex Essence",
    trophy: "Hexling Trophy (elite)",
    notes: "Biome 2 MAGE (redesigned 2026-07-12 — was a reskinned gremlin kiter). Distinct taller robed/staff texture. STANDS AND CASTS (no kite — only repositions via blink). Close-range punish: FLAME STRIKE calls down 3 delayed fire circles at your locked position (walk out to dodge) that detonate as magic AoE (18, bypasses armor), then it BLINKS ~220px away. Blink is also the cornered fallback. HP 30→55 so it's not 1-2-shot on reach. Resist: magic ×0.4, slash/blunt/pierce ×1.4 (weak to physical).",
  },
  {
    name: "Sandmaw (BADLANDS)",
    hp: 45,
    speed: 30,
    aggro: 62,
    attacks: [
      { label: "Sand Erupt (radial AoE, 95px burst, +220 knockback)", damage: 38, telegraphMs: 560 },
    ],
    loot: "1-2 Sandmaw Chitin",
    trophy: "Sandmaw Trophy (elite)",
    notes: "Biome 2 Phase 2b BURROWING AMBUSHER — the 4th native creature. Lurks submerged (near-invisible, alpha 0.18) until you enter its 62px ambush ring, then ERUPTS: a 560ms tremor telegraph (growing dust ring previews the 95px burst) → radial sand-burst (38 physical + 220 knockback, dodge by clearing the ring — movement/dash-dodgeable, i-frames negate) → planted 'exposed' punish window → burrows back under (2.6s re-ambush cooldown) and slow-stalks toward you (30px/s) to re-ambush. AoE routed through checkPlayerHit (like the bosses/Hexling flame), not a melee bite. Resist profile: pierce ×0.6, blunt ×1.4 — inverse of Cragscale, so clubs/warhammer shine here where the spear shines there. Attacked while submerged → surfaces & retaliates (like Snake). No pack.",
  },
  {
    name: "Gremlin King (BOSS)",
    hp: 600,
    speed: 45,
    aggro: 260,
    attacks: [
      { label: "Leaping Smash (leap to locked spot, AoE 120px + knockback)", damage: 60, telegraphMs: 780 },
      { label: "Charge (line, dodgeable)", damage: 55, telegraphMs: 850 },
      { label: "Ground Slam (AoE 150px + knockback)", damage: 55, telegraphMs: 950 },
    ],
    loot: "Gremlin King Fang (unique)",
    notes:
      "Poise 100 (stagger → 1.5× dmg for 3s). Enrages <50% HP: shorter telegraphs, faster — not more damage. The only enemy with real telegraph/dodge windows today.",
  },
  {
    name: "Gloamwarden (MINI-BOSS)",
    hp: 260,
    speed: 55,
    aggro: 240,
    attacks: [
      { label: "Leaping Smash (leap to locked spot, AoE 95px + knockback)", damage: 22, telegraphMs: 780 },
      { label: "Gloam Eruption (crystal spikes at locked ground spot, 72px)", damage: 24, telegraphMs: 920 },
    ],
    loot: "3-4 Gloam Shard + 1 Refined Trophy (+ cracks the vein)",
    notes:
      "Gloaming Vein guardian. Poise 60 (stagger → 1.5× dmg for 2.5s). Scale 1.7, scored as an elite kill. Bespoke attacks (NOT charge/radial-slam): a leaping smash (previews the Gremlin King) + a rooted crystal-eruption ground-target (punish window). Regens 10 HP/s while deaggro'd.",
  },
];

// ---------------------------------------------------------------------------
// Section renderers — each returns HTML for one tab.
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = ["tools", "weapons", "armor", "crafting", "misc"] as const;

function renderRecipes(): string {
  let html = `<h2>Recipes</h2>
    <p class="note">Every craftable recipe from <code>src/systems/Recipes.ts</code>.
    Tier 1+ recipes are invisible in-game until a Workbench has been placed, and require
    proximity to one to craft. Skill gates are <b>discovery-time</b> — a locked recipe is
    fully hidden until met.</p>
    <div class="searchwrap"><input type="search" data-filter="recipes" placeholder="Filter recipes…" /></div>`;

  for (const cat of CATEGORY_ORDER) {
    const rows = RECIPES.filter((r) => r.category === cat);
    if (!rows.length) continue;
    html += `<h3>${prettify(cat)}</h3><table data-table="recipes"><thead><tr>
      <th>Name</th><th>Tier</th><th>Cost</th><th>Skill gate</th><th>Output</th><th>Description</th>
      </tr></thead><tbody>`;
    for (const r of rows) html += recipeRow(r);
    html += `</tbody></table>`;
  }
  return html;
}

function recipeRow(r: Recipe): string {
  const skills = r.requiredSkills?.length
    ? r.requiredSkills.map((s) => `${prettify(s.skill)} ${s.level}`).join(", ")
    : `<span class="muted">—</span>`;
  let output = r.output.kind === "tool" ? "Tool" : "Item";
  if (isPlaceableRecipe(r)) output = "Placeable";
  else if (r.category === "weapons") output = "Weapon";
  else if (r.category === "armor") output = "Armor";
  return `<tr data-search="${esc((r.name + " " + Object.keys(r.costs).join(" ")).toLowerCase())}">
    <td><b>${esc(r.name)}</b></td>
    <td>${tierTag(r.tier)}</td>
    <td class="cost">${esc(costsText(r.costs))}</td>
    <td>${skills}</td>
    <td><span class="tag">${output}</span></td>
    <td class="muted">${esc(r.description)}</td>
  </tr>`;
}

function renderWeapons(): string {
  const weapons: WeaponType[] = ["wood_club", "stone_club", "bone_knife", "primal_spear"];
  let html = `<h2>Weapons</h2>
    <p class="note">Base stats from <code>Weapons.ts</code>; upgrade tiers from
    <code>WeaponUpgrades.ts</code>. <b>DPS</b> = damage × attacks/sec (before the
    weapon-skill damage multiplier of +0.5%/level). <b>Base crit</b> is the
    per-weapon floor (M-SS) — Agility adds chance, Strength adds multiplier, both
    all-weapon; <b>eff. DPS</b> folds base crit into Lvl 1 DPS
    (×(1 + chance×(mult−1))). <b>Stamina/hit</b> gates sustained swinging against
    the 100 base stamina pool.</p>
    <table><thead><tr>
      <th>Weapon</th><th>Type</th><th class="num">Lvl 1 dmg</th><th class="num">Lvl 2</th>
      <th class="num">Lvl 3</th><th class="num">Atk/s</th><th class="num">Lvl 1 DPS</th>
      <th class="num">Lvl 3 DPS</th><th class="num">Base crit</th>
      <th class="num">Eff. DPS</th><th class="num">Stam/hit</th>
      </tr></thead><tbody>`;
  for (const w of weapons) {
    const base = weaponDamage(w);
    const aps = weaponAttacksPerSecond(w);
    const hasUpg = WEAPON_UPGRADES.some((u) => u.appliesToItemKey === w);
    const lvl2 = hasUpg ? base + weaponTierDamageBonus(w, 1) : null;
    const lvl3 = hasUpg ? base + weaponTierDamageBonus(w, 2) : null;
    const dtype = damageTypeDisplayName(weaponPrimaryDamageType(w));
    const critChance = weaponBaseCritChance(w);
    const critMult = weaponBaseCritMult(w);
    const effDps = base * aps * (1 + critChance * (critMult - 1));
    html += `<tr>
      <td><b>${esc(name(w))}</b></td>
      <td><span class="tag">${dtype}</span></td>
      <td class="num">${base}</td>
      <td class="num">${lvl2 ?? "—"}</td>
      <td class="num">${lvl3 ?? "—"}</td>
      <td class="num">${round1(aps)}</td>
      <td class="num">${round1(base * aps)}</td>
      <td class="num">${lvl3 != null ? round1(lvl3 * aps) : round1(base * aps)}</td>
      <td class="num">${Math.round(critChance * 100)}% ×${round1(critMult)}</td>
      <td class="num">${round1(effDps)}</td>
      <td class="num">${weaponStaminaCost(w)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;

  html += `<h3>Weapon upgrade costs</h3><table><thead><tr>
    <th>Weapon</th><th>Upgrade</th><th>Result</th><th class="num">+Dmg</th><th>Cost</th>
    </tr></thead><tbody>`;
  for (const u of WEAPON_UPGRADES) {
    html += `<tr>
      <td>${esc(name(u.appliesToItemKey))}</td>
      <td>${esc(u.name)}</td>
      <td><span class="tag tier1">Lvl ${u.resultTier + 1}</span></td>
      <td class="num pos">+${u.damageBonus}</td>
      <td class="cost">${esc(costsText(u.costs))}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function renderArmor(): string {
  const armorItems = Object.values(ITEM_DEFS).filter((d) => d.armorSlot);
  let html = `<h2>Armor</h2>
    <p class="note">Defense is a <b>flat deduction</b> from incoming physical damage,
    floored at 1 per hit (<code>MainScene.applyDamageToPlayer</code>). Base from
    <code>Items.ts</code>; Lvl 2 / Lvl 3 bonuses from <code>ArmorUpgrades.ts</code> (each
    upgrade requires a Workbench that has itself reached Lvl 2).</p>
    <table><thead><tr>
      <th>Piece</th><th>Slot</th><th class="num">Base (Lvl 1)</th><th class="num">Lvl 2</th>
      <th class="num">Lvl 3</th><th>Craft cost</th>
      </tr></thead><tbody>`;
  const upgFor = (key: string, tier: number) => ARMOR_UPGRADES.find((u) => u.appliesToItemKey === key && u.resultTier === tier);
  let baseTotal = 0;
  let lvl2Total = 0;
  let lvl3Total = 0;
  for (const d of armorItems) {
    const base = armorDefenseForTier(d.key, 0);
    // Highest defined upgrade tier for this piece; missing tiers fall back to
    // the previous value so a piece with fewer upgrades still totals correctly.
    const lvl2 = upgFor(d.key, 1) ? armorDefenseForTier(d.key, 1) : base;
    const lvl3 = upgFor(d.key, 2) ? armorDefenseForTier(d.key, 2) : lvl2;
    baseTotal += base;
    lvl2Total += lvl2;
    lvl3Total += lvl3;
    const recipe = RECIPES.find((r) => r.output.kind === "item" && r.output.itemId === d.key);
    html += `<tr>
      <td><b>${esc(d.name)}</b></td>
      <td>${esc(prettify(d.armorSlot!))}</td>
      <td class="num">${base}</td>
      <td class="num pos">${lvl2}</td>
      <td class="num pos">${lvl3}</td>
      <td class="cost">${recipe ? esc(costsText(recipe.costs)) : "—"}</td>
    </tr>`;
  }
  html += `<tr><td colspan="2"><b>Full set</b></td>
    <td class="num"><b>${baseTotal}</b></td>
    <td class="num pos"><b>${lvl2Total}</b></td>
    <td class="num pos"><b>${lvl3Total}</b></td>
    <td class="muted">flat damage reduction, all pieces worn</td></tr>`;
  html += `</tbody></table>`;

  // Per-tier upgrade costs — two steps per piece (Lvl 2, Lvl 3).
  html += `<h3>Armor upgrade costs</h3><table><thead><tr>
    <th>Piece</th><th>Upgrade</th><th>Result</th><th class="num">+Armor</th><th>Cost</th>
    </tr></thead><tbody>`;
  for (const u of ARMOR_UPGRADES) {
    html += `<tr>
      <td>${esc(name(u.appliesToItemKey))}</td>
      <td>${esc(u.name)}</td>
      <td><span class="tag tier1">Lvl ${u.resultTier + 1}</span></td>
      <td class="num pos">+${u.defenseBonus ?? 0}</td>
      <td class="cost">${esc(costsText(u.costs))}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function renderStations(): string {
  let html = `<h2>Stations & Processing</h2>
    <p class="note">Station upgrades from <code>StationUpgrades.ts</code>; Drying Rack
    conversions from <code>Processing.ts</code>; campfire cooking from
    <code>Cooking.ts</code>.</p>`;

  html += `<h3>Station upgrades</h3><table><thead><tr>
    <th>Station</th><th>Upgrade</th><th>Result</th><th>Effect</th><th>Cost</th>
    </tr></thead><tbody>`;
  for (const u of STATION_UPGRADES) {
    html += `<tr>
      <td>${esc(name(u.appliesToItemKey))}</td>
      <td>${esc(u.name)}</td>
      <td><span class="tag tier1">Lvl ${u.resultTier + 1}</span></td>
      <td class="muted">${esc(u.deltaLabel ?? u.description)}</td>
      <td class="cost">${esc(costsText(u.costs))}</td>
    </tr>`;
  }
  html += `</tbody></table>`;

  html += `<h3>Drying Rack (instant processing)</h3><table><thead><tr>
    <th>Input</th><th>Output</th><th class="num">Ratio (in:out)</th>
    </tr></thead><tbody>`;
  for (const p of PROCESS_RECIPES) {
    html += `<tr>
      <td>${esc(name(p.input))}</td>
      <td>${esc(name(p.output))}</td>
      <td class="num">${p.inputPerOutput} : 1</td>
    </tr>`;
  }
  html += `</tbody></table>`;

  html += `<h3>Campfire cooking</h3><table><thead><tr>
    <th>Dish</th><th>Campfire</th><th>Ingredients</th><th>Buff</th>
    </tr></thead><tbody>`;
  for (const c of COOK_RECIPES) {
    const out = itemDef(c.output);
    const buff = out?.edible
      ? `+${out.edible.hpPerSec} HP/s for ${out.edible.durationMs / 1000}s`
      : "—";
    html += `<tr>
      <td><b>${esc(c.name)}</b></td>
      <td>${c.requiredCampfireTier >= 1 ? '<span class="tag tier1">Lvl 2</span>' : '<span class="tag">any</span>'}</td>
      <td class="cost">${esc(costsText(c.inputs))}</td>
      <td class="pos">${esc(buff)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function renderRelics(): string {
  let html = `<h2>Relics</h2>
    <p class="note">Run-length passives rolled at a Relic Forge from monster trophies
    (<code>Relics.ts</code>). Rolling is <b>probabilistic</b>: each attempt consumes one
    trophy whether it succeeds or fails. A trophy's own rarity drives an <b>outcome table</b>
    over the result rarity — a Common trophy can roll up to Uncommon/Rare (never Mythic) and
    can also fail; higher trophies guarantee at least their own rarity with a chance to roll
    up. A relic's power tier always equals the trophy's tier. The run's <b>first roll is a
    guaranteed success</b>; beyond that a per-rarity pity counter guarantees a base-rarity
    success after N misses. Effect numbers shown at Power Tier 1 (×1.0, the only tier this
    milestone). Only Common-trophy sources are live today.</p>`;

  html += `<h3>Trophy → outcome odds</h3><table><thead><tr>
    <th>Trophy</th><th>Trophy rarity</th><th class="num">Any relic</th><th>Outcome breakdown</th>
    <th class="num">Pity</th><th class="muted">Source</th>
    </tr></thead><tbody>`;
  const trophySource: Record<string, string> = {
    gremlin_trophy: "Elite Gremlin / Gremling",
    boar_trophy: "Elite Boar",
    snake_trophy: "Elite Snake",
    duskrunner_trophy: "Elite Duskrunner (badlands)",
    cragscale_trophy: "Elite Cragscale (badlands)",
    hexling_trophy: "Elite Hexling (badlands)",
    sandmaw_trophy: "Elite Sandmaw (badlands)",
    gremlin_king_fang: "Gremlin King (dormant — boss = win)",
    refined_trophy_uncommon: "Refinement (Gloaming Vein) — roll-only",
    refined_trophy_rare: "Refinement (scaffold) — roll-only",
  };
  for (const [key, roll] of Object.entries(TROPHY_ROLL)) {
    // A trophy's maxRarity caps its produced rarity (refined trophies can't roll
    // Mythic) — merge any capped-out band down into the cap rarity so the shown
    // odds match Relics.roll()'s clamp.
    const capIdx = roll.maxRarity ? RELIC_RARITIES.indexOf(roll.maxRarity) : Infinity;
    const bands: { rarity: typeof RELIC_RARITIES[number]; chance: number }[] = [];
    for (const b of TROPHY_OUTCOME_ODDS[roll.rarity]) {
      const eff = RELIC_RARITIES.indexOf(b.rarity) > capIdx ? roll.maxRarity! : b.rarity;
      const existing = bands.find((x) => x.rarity === eff);
      if (existing) existing.chance += b.chance;
      else bands.push({ rarity: eff, chance: b.chance });
    }
    // Bands are sequential ranges; a Rare/Uncommon floor band (100%) shows as
    // "rest", others as their exact chance.
    let used = 0;
    const breakdown = bands
      .map((b) => {
        const label =
          b.chance >= 1
            ? `${rarityName(b.rarity)} (rest)`
            : `${(b.chance * 100).toFixed(b.chance * 100 < 10 ? 1 : 0)}% ${rarityName(b.rarity)}`;
        used += b.chance;
        return `<span style="color:${rarityHex(b.rarity)}">${label}</span>`;
      })
      .join(", ");
    const failPct = Math.max(0, 1 - used);
    const failStr = failPct > 0 ? `, <span class="muted">${Math.round(failPct * 100)}% fail</span>` : "";
    html += `<tr>
      <td>${esc(name(key))}</td>
      <td><span class="dot" style="background:${rarityHex(roll.rarity)}"></span>${rarityName(roll.rarity)} · T${roll.powerTier}</td>
      <td class="num">${Math.round(trophyOverallSuccessChance(roll.rarity) * 100)}%</td>
      <td>${breakdown}${failStr}</td>
      <td class="num">${PITY_THRESHOLD[roll.rarity]}</td>
      <td class="muted">${esc(trophySource[key] ?? "—")}</td>
    </tr>`;
  }
  html += `</tbody></table>`;

  // Trophy refinement (Gloaming Vein) — spend Gloam Shards to climb a raw
  // trophy one rarity up into a guaranteed-roll refined trophy.
  html += `<h3>Trophy refinement — Gloaming Vein</h3>
    <p class="note">The Relic Forge's <b>Refine tab</b> spends <b>Gloam Shards</b> (mined
    from the Gloaming Vein POI, gated behind the <b>Gloamwarden</b> mini-boss) to climb a
    raw trophy one rarity up into a <b>refined trophy that never crumbles</b>. Single-step +
    terminal (refined trophies are never a refine input); species-agnostic; requires
    trophy tier == shard tier.</p>
    <table><thead><tr>
      <th>Input trophies</th><th class="num">Gloam Shards</th><th>Output</th><th class="muted">Notes</th>
      </tr></thead><tbody>`;
  for (const r of REFINE_RECIPES) {
    const scaffold = r.inputRarity !== "common";
    html += `<tr>
      <td>${r.inputCount} × ${rarityName(r.inputRarity)} (any species)</td>
      <td class="num">${r.shardCount}</td>
      <td><b>${esc(name(r.output))}</b></td>
      <td class="muted">${scaffold ? "scaffold — no raw source in biome 1" : "biome 1"}</td>
    </tr>`;
  }
  html += `</tbody></table>`;

  html += `<div class="searchwrap"><input type="search" data-filter="relics" placeholder="Filter relics…" /></div>`;
  for (const rarity of RELIC_RARITIES) {
    const ids = RELIC_POOLS[rarity];
    if (!ids.length) continue;
    // A pool is "reachable" if any trophy's outcome table can produce it.
    const live = Object.values(TROPHY_ROLL).some((t) =>
      TROPHY_OUTCOME_ODDS[t.rarity].some((b) => b.rarity === rarity),
    );
    html += `<h3 style="color:${rarityHex(rarity)}">${rarityName(rarity)}
      <span class="muted" style="font-size:12px;font-weight:400">
      ${live ? "· reachable from a live trophy" : "· <i>no trophy source yet (M-W1 scaffolding)</i>"}</span></h3>`;
    html += `<table data-table="relics"><thead><tr><th>Relic</th><th>Effect</th></tr></thead><tbody>`;
    for (const id of ids) {
      const def = RELIC_DEFS[id];
      html += `<tr data-search="${esc((def.name + " " + relicEffectText(def)).toLowerCase())}">
        <td><span class="dot" style="background:${rarityHex(rarity)}"></span><b>${esc(def.name)}</b></td>
        <td class="pos">${esc(relicEffectText(def))}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
  }
  return html;
}

function renderEnemies(): string {
  let html = `<h2>Enemies</h2>
    <p class="note"><b>⚠ Manually mirrored</b> from the entity files (Boar/Snake/Gremlin/
    GremlinKing) — unlike every other tab, these aren't imported live, since enemy stats
    live inside Phaser sprite subclasses. Keep in sync when tuning. Elite variants:
    +50% HP/dmg, +10% speed, larger scale, 2× loot, + a species trophy.</p>
    <table><thead><tr>
      <th>Enemy</th><th class="num">HP</th><th class="num">Elite HP</th><th>Attacks (dmg)</th>
      <th class="num">Speed</th><th class="num">Aggro</th><th>Loot</th>
      </tr></thead><tbody>`;
  for (const e of ENEMIES) {
    const atk = e.attacks
      .map((a) => {
        const tel = a.telegraphMs ? ` <span class="muted">[${a.telegraphMs}ms tell]</span>` : "";
        return `${a.label} <b class="neg">${a.damage}</b>${tel}`;
      })
      .join("<br>");
    html += `<tr>
      <td><b>${esc(e.name)}</b>${e.notes ? `<br><span class="muted" style="font-size:11.5px">${esc(e.notes)}</span>` : ""}</td>
      <td class="num">${e.hp}</td>
      <td class="num">${e.name.includes("BOSS") ? "—" : Math.round(e.hp * ELITE_MULT)}</td>
      <td>${atk}</td>
      <td class="num">${e.speed}</td>
      <td class="num">${e.aggro}</td>
      <td class="muted">${esc(e.loot)}${e.trophy ? `<br>+ ${esc(e.trophy)}` : ""}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function renderBalance(): string {
  // Effective incoming damage after flat armor (floored at 1), at three armor
  // breakpoints: none, full base set, full upgraded set. Directly visualizes
  // the "trivial damage in Lvl 2 armor" playtest complaint. Both normal and
  // elite (+50% dmg) attacks are listed.
  //
  // ASSUMPTION / FUTURE REWORK: "the full set" is just the sum over EVERY armor
  // ItemDef — correct today only because exactly one armor set (Gremlin) exists,
  // one piece per slot. Once multiple options per slot exist, summing all of them
  // is wrong (you can't wear two chests). This tab will then need best-per-slot
  // or a set picker, and likely more than one set column.
  const armorItems = Object.values(ITEM_DEFS).filter((d) => d.armorSlot);
  const baseSet = armorItems.reduce((s, d) => s + armorDefenseForTier(d.key, 0), 0);
  // Fully-upgraded set = each piece at its highest defined upgrade tier (Lvl 3).
  const upgSet = armorItems.reduce((s, d) => {
    const tiers = ARMOR_UPGRADES.filter((x) => x.appliesToItemKey === d.key).map((x) => x.resultTier);
    const maxTier = tiers.length ? Math.max(...tiers) : 0;
    return s + armorDefenseForTier(d.key, maxTier);
  }, 0);

  const dealt = (raw: number, armor: number) => Math.max(1, raw - armor);
  const hits = (raw: number, armor: number) => Math.ceil(PLAYER_BASE_HP / dealt(raw, armor));
  const cell = (raw: number, armor: number) => {
    const d = dealt(raw, armor);
    const cls = d <= 2 ? "neg" : "";
    return `<td class="num ${cls}">${d} <span class="muted">(${hits(raw, armor)} hits)</span></td>`;
  };

  let html = `<h2>Balance Overview</h2>
    <p class="note">Derived from live data. Player base pool is
    <b>${PLAYER_BASE_HP} HP</b> / ${PLAYER_BASE_STAMINA} stamina (before Vitality/Endurance
    points and relics). "Hits to kill you" assumes no regen/dodge.</p>
    <div class="cardrow">
      <div class="card"><div class="big">${PLAYER_BASE_HP}</div><div class="lbl">Base HP</div></div>
      <div class="card"><div class="big">${baseSet}</div><div class="lbl">Full armor (base)</div></div>
      <div class="card"><div class="big">${upgSet}</div><div class="lbl">Full armor (Lvl 3)</div></div>
    </div>`;

  const isBoss = (e: EnemyStat) => e.name.includes("BOSS");

  html += `<h3>Incoming damage vs armor — <span class="muted" style="font-weight:400">damage per hit (hits to kill you)</span></h3>
    <p class="legend">Armor is subtracted flat then floored at 1. <span class="neg">Red</span> = floored to ≤2,
    i.e. the "1 damage per hit" trivial feel. <span class="tag" style="border-color:var(--bad);color:var(--bad)">Elite</span>
    rows are the +50% variant — this is where you check whether armor still holds up. This is the exact spot the light rebalance targets.</p>
    <table><thead><tr>
      <th>Attack</th><th class="num">Raw</th><th class="num">No armor</th>
      <th class="num">Base set (${baseSet})</th><th class="num">Lvl 3 set (${upgSet})</th>
      </tr></thead><tbody>`;
  // Both normal and elite entries; the elite row is skipped when it wouldn't
  // differ (e.g. the Gremlin's non-scaled rock projectile) to avoid a dup.
  const attackList: { label: string; raw: number; elite: boolean }[] = [];
  for (const e of ENEMIES) {
    for (const a of e.attacks) {
      attackList.push({ label: `${e.name}: ${a.label}`, raw: a.damage, elite: false });
      if (isBoss(e)) continue;
      const eliteRaw = a.eliteScales === false ? a.damage : Math.round(a.damage * ELITE_MULT);
      if (eliteRaw !== a.damage) attackList.push({ label: `${e.name}: ${a.label}`, raw: eliteRaw, elite: true });
    }
  }
  attackList.sort((a, b) => a.raw - b.raw || Number(a.elite) - Number(b.elite));
  for (const a of attackList) {
    const tag = a.elite
      ? ` <span class="tag" style="border-color:var(--bad);color:var(--bad)">Elite</span>`
      : "";
    html += `<tr><td>${esc(a.label)}${tag}</td><td class="num">${a.raw}</td>
      ${cell(a.raw, 0)}${cell(a.raw, baseSet)}${cell(a.raw, upgSet)}</tr>`;
  }
  html += `</tbody></table>
    <p class="legend">Note: the Elite Gremlin's <b>rock projectile stays 8</b> (fixed
    <code>PROJECTILE_DAMAGE</code>, not elite-scaled in code) — only its melee claw gets +50%.</p>`;

  // Weapon TTK vs each enemy, normal + elite HP (offense side — armor irrelevant).
  const weapons: WeaponType[] = ["wood_club", "stone_club", "bone_knife", "primal_spear"];
  const ttkRow = (label: string, hp: number, elite: boolean) => {
    const tag = elite ? ` <span class="tag" style="border-color:var(--bad);color:var(--bad)">Elite</span>` : "";
    let row = `<tr><td>${esc(label)}${tag}</td><td class="num">${hp}</td>`;
    for (const w of weapons) {
      const dps = weaponDamage(w) * weaponAttacksPerSecond(w);
      row += `<td class="num">${round1(hp / dps)}s</td>`;
    }
    return row + `</tr>`;
  };
  html += `<h3>Time to kill — <span class="muted" style="font-weight:400">Lvl 1 weapon DPS vs enemy HP (seconds)</span></h3>
    <p class="legend">= HP ÷ (dmg × atk/s). Ignores the weapon-skill damage bonus, relics, and misses.</p>
    <table><thead><tr><th>Enemy</th><th class="num">HP</th>`;
  for (const w of weapons) html += `<th class="num">${esc(name(w))}</th>`;
  html += `</tr></thead><tbody>`;
  for (const e of ENEMIES) {
    html += ttkRow(e.name, e.hp, false);
    if (!isBoss(e)) html += ttkRow(e.name, Math.round(e.hp * ELITE_MULT), true);
  }
  html += `</tbody></table>`;
  return html;
}

function renderItems(): string {
  const typeOf = (d: ItemDef): string => {
    if (d.tool) return "Tool";
    if (d.weapon) return "Weapon";
    if (d.armorSlot) return "Armor";
    if (d.edible) return "Food";
    if (d.placeable) return "Placeable";
    if (d.stats?.some((s) => s.value === "Ritual Item")) return "Ritual";
    return "Resource";
  };
  let html = `<h2>All Items</h2>
    <p class="note">Every <code>ItemDef</code> from <code>Items.ts</code> — raw resources
    and crafted outputs. "Stack" is the max stack size (1 = unique/durability item).</p>
    <div class="searchwrap"><input type="search" data-filter="items" placeholder="Filter items…" /></div>
    <table data-table="items"><thead><tr>
      <th>Name</th><th>Key</th><th>Type</th><th class="num">Stack</th><th>Description</th>
      </tr></thead><tbody>`;
  for (const d of Object.values(ITEM_DEFS)) {
    html += `<tr data-search="${esc((d.name + " " + d.key + " " + typeOf(d)).toLowerCase())}">
      <td><b>${esc(d.name)}</b></td>
      <td class="muted">${esc(d.key)}</td>
      <td><span class="tag">${typeOf(d)}</span></td>
      <td class="num">${d.maxStack}</td>
      <td class="muted">${esc(d.description)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

// ---------------------------------------------------------------------------
// Shell: tabbed nav + live search filtering
// ---------------------------------------------------------------------------

const TABS: { id: string; label: string; render: () => string }[] = [
  { id: "recipes", label: "Recipes", render: renderRecipes },
  { id: "weapons", label: "Weapons", render: renderWeapons },
  { id: "armor", label: "Armor", render: renderArmor },
  { id: "stations", label: "Stations & Food", render: renderStations },
  { id: "relics", label: "Relics", render: renderRelics },
  { id: "enemies", label: "Enemies", render: renderEnemies },
  { id: "balance", label: "Balance Overview", render: renderBalance },
  { id: "items", label: "All Items", render: renderItems },
];

function mount(): void {
  const nav = document.getElementById("nav")!;
  const app = document.getElementById("app")!;

  for (const tab of TABS) {
    const btn = document.createElement("button");
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    nav.appendChild(btn);

    const sec = document.createElement("section");
    sec.id = `sec-${tab.id}`;
    sec.innerHTML = tab.render();
    app.appendChild(sec);
  }

  const activate = (id: string) => {
    for (const b of nav.querySelectorAll("button")) b.classList.toggle("active", (b as HTMLElement).dataset.tab === id);
    for (const s of app.querySelectorAll("section")) s.classList.toggle("active", s.id === `sec-${id}`);
    location.hash = id;
  };

  nav.addEventListener("click", (e) => {
    const id = (e.target as HTMLElement).dataset?.tab;
    if (id) activate(id);
  });

  // Live per-table search on any [data-filter] input, filtering rows by their
  // data-search attribute within the same section.
  app.addEventListener("input", (e) => {
    const inp = e.target as HTMLInputElement;
    if (inp.dataset?.filter == null) return;
    const q = inp.value.trim().toLowerCase();
    const section = inp.closest("section")!;
    for (const row of section.querySelectorAll<HTMLTableRowElement>("tbody tr[data-search]")) {
      row.style.display = !q || row.dataset.search!.includes(q) ? "" : "none";
    }
  });

  const initial = TABS.some((t) => t.id === location.hash.slice(1)) ? location.hash.slice(1) : TABS[0].id;
  activate(initial);
}

mount();
