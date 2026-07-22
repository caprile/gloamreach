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
  weaponArc,
  weaponIdentityLine,
  damageTypeDisplayName,
  BLUNT_SLOW_FACTOR,
  BLUNT_SLOW_MS,
  type WeaponType,
} from "../systems/Weapons";
import { WEAPON_UPGRADES, weaponTierDamageBonus } from "../systems/WeaponUpgrades";
import { TOOL_UPGRADES } from "../systems/ToolUpgrades";
import { ARMOR_UPGRADES, armorDefenseForTier } from "../systems/ArmorUpgrades";
import { STATION_UPGRADES } from "../systems/StationUpgrades";
import { GEAR_AUGMENTS, MAX_AUGMENTS_PER_ITEM } from "../systems/GearAugments";
import { CHARACTER_DEFS } from "../systems/Characters";
import { ABILITY_DEFS } from "../systems/Abilities";
import { EPIC_ITEM_KEYS, EPIC_POOL_T1, EPIC_POOL_T2, EPIC_POOL_T3 } from "../systems/EpicLoot";
import type { EpicPool } from "../systems/LootContainer";
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
  relicFamilyName,
  TROPHY_ROLL,
  REFINE_RECIPES,
  GLOAM_TO_EMBER_RATIO,
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
      { label: "Pounce (locked leap, 190px band, 32px hit, cd 560ms)", damage: 42, telegraphMs: 260 },
      { label: "Bite (point-blank fallback, 30px reach, cd 140ms)", damage: 42, telegraphMs: 180 },
    ],
    loot: "1 Duskrunner Pelt + 1 Duskrunner Meat (elite 2x each)",
    trophy: "Duskrunner Trophy (elite)",
    notes: "Biome 2 canid swarm. Fast, low-HP. Signature POUNCE gap-closer (sidestep-dodgeable) + point-blank bite. Pack-aggro (radius 260) — an aggro'd runner wakes packmates; spawns in packs of 3-4 AND rallies packmates to pounce together (attack-sync). Neutral resists (the AOE-arc payoff enemy). Now also a badlands FOOD SOURCE — drops raw Duskrunner Meat. Guards the Duskrunner Warren POI in two waves (3 normal, then 3 elite); den guards are ANCHORED (no idle wander). 2026-07-13 tuning: dmg 34→42, VERY hard to deaggro (leash 280→620), faster attack cooldowns.",
  },
  {
    name: "Cragscale (BADLANDS)",
    hp: 60,
    speed: 40,
    aggro: 130,
    attacks: [
      { label: "Rolling charge (300px/s, 58px hit, +BLEED 5/s×4s)", damage: 48, telegraphMs: 560 },
      { label: "Heavy basher (point-blank + 180 shove)", damage: 48, telegraphMs: 520 },
    ],
    loot: "1-2 Cragscale Plate",
    trophy: "Cragscale Trophy (elite)",
    notes: "Biome 2 armored bruiser (tanky, slow). Signature ROLLING CHARGE closes on kiters + a point-blank basher. Roll reworked 2026-07-12: faster (240→300) + wider (30→40px hit) so it forces a real dash/dodge, and a connect opens a BLEED wound (5/s for 4s, stacks) + 230 shove — the heavy must-dodge threat vs the Duskrunner's light pounce. Resist profile (normalized 2026-07-15 — weak ×1.25 / resist ×0.5 across the biome): slash ×0.5, pierce ×1.25 (weak), FIRE ×0.5; blunt now neutral — teaches the damage-type layer (Primal Spear favored, blades bounce); fire-resistant so Emberblink's nova isn't a blanket answer.",
  },
  {
    name: "Hexling (BADLANDS)",
    hp: 95,
    speed: 46,
    aggro: 170,
    attacks: [
      { label: "Hex bolt (projectile 250px, BYPASSES armor)", damage: 26, eliteScales: false },
      { label: "Flame Strike (3 delayed magic AoE circles, 48px, close-range)", damage: 40, telegraphMs: 820 },
    ],
    loot: "1 Hex Essence",
    trophy: "Hexling Trophy (elite)",
    notes: "Biome 2 MAGE (redesigned 2026-07-12 — was a reskinned gremlin kiter). Distinct taller robed/staff texture. STANDS AND CASTS (no kite — only repositions via blink). Close-range punish: FLAME STRIKE calls down 3 delayed fire circles at your locked position (walk out to dodge) that detonate as magic AoE (18, bypasses armor), then it BLINKS ~220px away. Blink is also the cornered fallback. HP 30→55→95 (playtest: died too fast even in Woods-tier gear). Resist profile (normalized 2026-07-15 — weak ×1.25 across the biome): magic ×1.25 (weak), FIRE ×1.25 (weak), physical neutral — magic AND fire weapons hurt it. S2: BLINK cooldown 2600→5200ms + no longer blinks after every flame strike (playtest: 'teleports too much') — commits to standing and casting far more.",
  },
  {
    name: "Sandmaw (BADLANDS)",
    hp: 45,
    speed: 30,
    aggro: 62,
    attacks: [
      { label: "Sand Erupt (radial AoE, 95px burst, +220 knockback, +BLEED 4/s×5s)", damage: 46, telegraphMs: 470 },
    ],
    loot: "1-2 Sandmaw Chitin",
    trophy: "Sandmaw Trophy (elite)",
    notes: "Biome 2 Phase 2b BURROWING AMBUSHER — the 4th native creature. Lurks submerged (near-invisible, alpha 0.18) until you enter its 62px ambush ring, then ERUPTS: a 560ms tremor telegraph (growing dust ring previews the 95px burst) → radial sand-burst (38 physical + 220 knockback, dodge by clearing the ring — movement/dash-dodgeable, i-frames negate) → planted 'exposed' punish window → burrows back under (2.6s re-ambush cooldown) and slow-stalks toward you (30px/s) to re-ambush. AoE routed through checkPlayerHit (like the bosses/Hexling flame), not a melee bite. Resist profile (normalized 2026-07-15): pierce ×0.5, blunt ×1.25 (weak), FIRE ×0.5 — inverse of Cragscale, so clubs/warhammer shine here where the spear shines there; fire-resistant (at home in the heat). Signature BLEED (4/s×5s) on the erupt hit + a snappier 470ms telegraph (2026-07-15). Attacked while submerged → surfaces & retaliates (like Snake). No pack.",
  },
  {
    name: "Mirejaw (BAYOU)",
    hp: 320,
    speed: 138,
    aggro: 240,
    attacks: [
      { label: "Ambush lunge (locked line, 340px @560px/s, +190 kb, +BLEED 9/s×6s)", damage: 120, telegraphMs: 430 },
      { label: "Chomp (56px reach, +110 kb, +BLEED 6/s×4s)", damage: 85, telegraphMs: 440 },
    ],
    loot: "1-2 Mirehide + 1-2 Mirejaw Meat",
    trophy: "Mirejaw Trophy (elite)",
    notes: "Biome 3 SIGNATURE AMBUSHER and the game's ONLY Mirehide source (locked) — the bayou light-armor reforge tier is gated behind hunting it. Sprite drawn BIG (48x22 at 1.55x = 74x34 on screen, the largest common creature — the user: 'the gators are too small'). STALK PATIENCE: stalking is slow by design, so a player who just keeps walking could never be ambushed (it fell 537px behind and never engaged) — after 2.4s of fruitless stalking it ABANDONS STEALTH and hunts at 138px/s. Walking away = it closes on you; sprinting away = clean escape. Lurks half-sunk (alpha 0.4 — VISIBLE, unlike the Sandmaw's 0.18) and creeps into position, then commits a LOCKED-LINE lunge chomp you sidestep. Unlike the Sandmaw it does NOT re-submerge after one attempt: it surfaces and HUNTS, chomping in melee and re-lunging from mid-range, and only re-buries once it loses you. Resists pierce ×0.5 (bony scutes), weak slash ×1.25 (soft belly) — the inverse of the Fenlurker. TUNING PASS 2026-07-22 (the user: 'remember how powerful the player is - think about how fast players will be'): the first numbers were sized against the BADLANDS roster, not a bayou-ready player (sprint 166-229px/s, dash 450, 220px blink, hits for 45-70 / 130-200 crit). Speeds, HP and damage were all raised so the roster can actually reach and threaten that player.",
  },
  {
    name: "Blighttoad (BAYOU)",
    hp: 150,
    speed: 300,
    aggro: 270,
    attacks: [{ label: "Venom bite (+POISON 9/s×6s, STACKS to 4x, bypasses armor)", damage: 66, telegraphMs: 340 }],
    loot: "1 Blight Gland",
    trophy: "Blighttoad Trophy (elite)",
    notes: "Biome 3 POISON carrier — the creature half of the biome's signature status effect. The bite itself is mostly eaten by bayou-tier armor; the POISON is the payload: it's a magic subtype so it BYPASSES flat armor, it STACKS per bite (discrete doses, unlike the miasma's refresh-only sustain), and it halves every heal source while it runs — so it also stops you eating your way out. Semi-swarm via pack-aggro (radius 200, base-state pattern), spawns in loose clumps of 2-3. Burst HOP locomotion (150px/s hops with a 620ms planted beat = well under player walk speed on average). Resists magic ×0.6, weak fire ×1.25. TUNING PASS 2026-07-22 (the user: 'remember how powerful the player is - think about how fast players will be'): the first numbers were sized against the BADLANDS roster, not a bayou-ready player (sprint 166-229px/s, dash 450, 220px blink, hits for 45-70 / 130-200 crit). Speeds, HP and damage were all raised so the roster can actually reach and threaten that player.",
  },
  {
    name: "Mosswretch (BAYOU)",
    hp: 420,
    speed: 74,
    aggro: 250,
    attacks: [{ label: "Overhead smash (88px reach, +300 knockback)", damage: 135, telegraphMs: 780 }],
    loot: "2-3 Swamp Moss + 1-2 Wood",
    trophy: "Mosswretch Trophy (elite)",
    notes: "Biome 3 BRUISER (the Cragscale analog) — the slowest common enemy in the game (36px/s, always outwalkable) and the tankiest (190 HP). ONE attack with the longest common-roster wind-up (780ms) and a 720ms recovery, so every hit it lands is one you chose not to walk out of, and baiting it is the intended fight. THE FIRE LESSON of the roster: fire ×1.5 — the biggest weakness multiplier on any common enemy (above the biome-2-normalized ×1.25), so Ember Brand / the set-bonus novas + thorns become a deliberate answer to a specific creature. Resists blunt ×0.5 (you can't concuss wet moss), weak slash ×1.25. TUNING PASS 2026-07-22 (the user: 'remember how powerful the player is - think about how fast players will be'): the first numbers were sized against the BADLANDS roster, not a bayou-ready player (sprint 166-229px/s, dash 450, 220px blink, hits for 45-70 / 130-200 crit). Speeds, HP and damage were all raised so the roster can actually reach and threaten that player.",
  },
  {
    name: "Murkling (BAYOU)",
    hp: 40,
    speed: 172,
    aggro: 300,
    attacks: [{ label: "Claw (skitter-slash, shortest telegraph in the game)", damage: 62, telegraphMs: 150 }],
    loot: "1-2 Gloam Dust",
    trophy: "Murkling Trophy (elite)",
    notes: "Biome 3 FAST MELEE SWARM (the Duskrunner analog) and the AOE-arc payoff enemy. Dies to a single bayou-tier weapon hit; the threat is 4-6 at once. Faster than the player's walk, so you can't stroll away. Wide pack-aggro (radius 300) with the base-state zero-override pattern — one waking wakes the reed-bed. No pounce (that's the Duskrunner's): it just swarms, weaving in at a per-instance angular offset that straightens as it closes, so a nest fans out instead of stacking into one pixel. DELIBERATELY NEUTRAL to every damage type — it's the baseline you measure a weapon's sweep against. TUNING PASS 2026-07-22 (the user: 'remember how powerful the player is - think about how fast players will be'): the first numbers were sized against the BADLANDS roster, not a bayou-ready player (sprint 166-229px/s, dash 450, 220px blink, hits for 45-70 / 130-200 crit). Speeds, HP and damage were all raised so the roster can actually reach and threaten that player.",
  },
  {
    name: "Fenlurker (BAYOU)",
    hp: 220,
    speed: 130,
    aggro: 120,
    attacks: [
      { label: "Erupting maul (LOCKED line, 150px rake, +240 kb, +BLEED 7/s×5s)", damage: 110, telegraphMs: 500 },
    ],
    loot: "2-3 Bones",
    trophy: "Fenlurker Trophy (elite)",
    notes: "Biome 3 MUCK-BURROWING AMBUSHER — the Sandmaw's water analog, shipped alongside it deliberately because the DODGE VERB is opposite: the Sandmaw detonates a RING (dodge by clearing distance), the Fenlurker rakes a LOCKED LINE out of the mud (dodge by stepping aside), and a dodged maul leaves it planted for a full 1s exposed punish with no radial safety net. Invisible (alpha 0.12) AND untargetable while buried (the Sandmaw's locked rule); tunnels toward you at 40px/s with a faint silt-wake tell. AoE-damaged while buried → bursts out and retaliates. Resists slash ×0.5 (slick and boneless), weak blunt ×1.25 — the exact inverse of the Mirejaw, so the two bayou ambushers want different weapons. TUNING PASS 2026-07-22 (the user: 'remember how powerful the player is - think about how fast players will be'): the first numbers were sized against the BADLANDS roster, not a bayou-ready player (sprint 166-229px/s, dash 450, 220px blink, hits for 45-70 / 130-200 crit). Speeds, HP and damage were all raised so the roster can actually reach and threaten that player.",
  },
  {
    name: "Corpselight (BAYOU, uncommon)",
    hp: 190,
    speed: 85,
    aggro: 340,
    attacks: [{ label: "Gloam orb (HOMING projectile 170px/s, 9s, magic — BYPASSES armor)", damage: 34 }],
    loot: "3-5 Hex Essence",
    trophy: "Corpselight Trophy (elite)",
    notes: "Biome 3's ONE ranged creature and deliberately UNCOMMON (~1/3 of any melee species) — the exception that keeps the roster reading melee-core. Fires the game's FIRST HOMING projectile (Projectile.homing): a bounded reversal of the anti-kite governor — 110px/s (under a walking player), 1.5 rad/s turn rate (lateral movement out-turns it into a lazy overshoot), 9s hard lifetime / ~1500px of pursuit (an overshot orb expires instead of orbiting forever). The first pass paired 110px/s with a 4.2s lifetime = a ~460px leash, so orbs 'faded away really soon' and it read as harmless (the user). STANDING STILL is what gets you hit — 170px/s is still under a sprint, so running straight outruns it outright. Magic damage bypasses flat armor, so bayou plate is no answer — footwork is. Holds a ~210px standoff and drifts, but has NO blink/escape, so closing the gap really does beat it. Neutral to physical on purpose (the Hexling's old flat physical resist felt unkillable); weak fire ×1.25 + magic ×1.25. Also the bayou's local HEX ESSENCE source, so forging Gloamsteel doesn't require walking back to the badlands. TUNING PASS 2026-07-22 (the user: 'remember how powerful the player is - think about how fast players will be'): the first numbers were sized against the BADLANDS roster, not a bayou-ready player (sprint 166-229px/s, dash 450, 220px blink, hits for 45-70 / 130-200 crit). Speeds, HP and damage were all raised so the roster can actually reach and threaten that player.",
  },
  {
    name: "The Palewake (CRYPT WARDEN — gloam)",
    hp: 240,
    speed: 96,
    aggro: 300,
    attacks: [
      { label: "Gloam tether (channel, 10 dmg / 450ms, MAGIC — bypasses armor)", damage: 10, telegraphMs: 460 },
    ],
    loot: "2-3 Moonsilver + 2-4 Gloam Shard — and unseals the vault's Gloam Geodes + Moonsilver seams",
    notes:
      "Biome 3 Phase 4c. Guards a gloam Sunken Crypt. NO POISE BAR — deliberately not the Gloamwarden/Cinderwrought idle→telegraph→execute→recover skeleton (the user: each crypt warden must feel different from each other AND from every previous mini-boss). Loop: stalking (near-invisible AND untargetable, circles to a flank) → manifest → tether (drains you and will NOT stop on its own) → unravel (1.6× damage punish) → vanish. The ONLY way to open it is to BREAK THE TETHER by putting a wall or pillar between you — a dodge verb that only exists because 4c introduced interiors with real occluders. Ride the channel out and you get nothing. Its vault is seeded with extra pillars so there is always something to hide behind, and it picks flanks with clear line-of-sight so the break is the player's work, not a free gift.",
  },
  {
    name: "The Kilnborn (CRYPT WARDEN — ember)",
    hp: 300,
    speed: 50,
    aggro: 300,
    attacks: [
      { label: "Ember lash (fire jab)", damage: 30, telegraphMs: 440 },
      { label: "BACKDRAFT (sweeps the burning floor — cold tiles are safe)", damage: 58, telegraphMs: 1600 },
      { label: "Burning floor tick (standing in fire)", damage: 7 },
    ],
    loot: "2-3 Moonsilver + 2-4 Gloam Shard — and unseals the vault's Ember Geodes + Moonsilver seams",
    notes:
      "Biome 3 Phase 4c. Driven by a HEAT meter that RISES AS IT ACTS, not a poise meter that falls as you hit it. Rising heat sets its vault's floor alight tile by tile (32px grid, up to 62% of the room), so the arena shrinks as the fight runs; at full heat it detonates a backdraft that sweeps exactly the ground that is already burning — the dodge is not a direction, it's standing on COLD ground. The punish window is `venting` (1.7× damage), which arrives on the BOSS's clock: you survive to it, you can't force it early. All damage is `fire` (bypasses flat armor; heavy-armor magic/fire mitigation is the counter). Resists blunt ×0.75 / fire ×0.4, weak to pierce ×1.25.",
  },
  {
    name: "The Sanguinarch (CRYPT WARDEN — blood)",
    hp: 280,
    speed: 88,
    aggro: 300,
    attacks: [
      { label: "Flurry (fast, stacks BLEED 6 dps / 5s — the bleed is the payload)", damage: 15, telegraphMs: 300 },
      { label: "Engorged slam (AoE 96px + 220 knockback)", damage: 50, telegraphMs: 720 },
      { label: "Feed (channel — heals 45 ONLY if you are bleeding)", damage: 0, telegraphMs: 1500 },
    ],
    loot: "2-3 Moonsilver + 2-4 Gloam Shard — and unseals the vault's Blood Geodes + Moonsilver seams",
    notes:
      "Biome 3 Phase 4c. THE PLAYER sets its phase, not the boss. Its flurry stacks bleed; every ~5s it channels a feed that resolves against your state AT THE END — bleeding when it lands and it drinks (heals 45) and swells into `engorged`: slow, huge slams, and 1.7× incoming damage for 6.5s. Deny it (dodge the flurry, or outlast the stacks through the channel) and it simply stays a fast, frantic, never-vulnerable frenzy. So bleeding is the only way to buy an opening, and it costs you. Resists blunt ×0.75, weak slash ×1.3.",
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
    loot: "Gremlin King's Heart (Phase-4 smelting gate) + 1 Boss Trophy (S4: guaranteed Mythic, Tier 1)",
    notes:
      "Poise 100 (stagger → 1.5× dmg for 3s). Enrages <50% HP: shorter telegraphs, faster — not more damage. The one boss you kill mid-run, so its Boss Trophy is actually spendable.",
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
  {
    name: "Cinderwrought (MINI-BOSS)",
    hp: 650,
    // PB17: SOLO + tanky (260→650) + UNSTAGGERABLE (no poise mechanic). Fully neutral to every type.
    speed: 52,
    aggro: 260,
    attacks: [
      { label: "Cinder Cone (RE-AIMS at player on fire — locks at execute, FIRE cone 300px / ±44°, bypasses armor; can't walk out, must DASH)", damage: 44, telegraphMs: 720 },
      { label: "Forge Hammer (heavy PHYSICAL front-arc smash, re-aims at execute, 235px / ±70°, armor applies; back-pedal fails at 95px/s, must DASH)", damage: 52, telegraphMs: 660 },
    ],
    loot: "5-8 Ember Shard + 1 Ember-Refined Trophy (Uncommon, Tier 2). Its ring of shielded Ember Deposits cracks open on death.",
    notes:
      "Sunken Forge guardian (badlands Phase 3 POI 2). 5 forges × 1 Cinderwrought each = 5. PB17 REWORK (the user: the old 2v1 of stationary fire-swingers felt awkward/incohesive vs the solo Gloamwarden): now ONE solo boss, HP 260→650, and CANNOT be staggered (poise mechanic removed entirely — a pure survive-and-DPS wall). Both attacks now RE-AIM at the player at execute (lock at execute, track through the wind-up) with wide/long hitboxes, so a slow-walking player (95px/s) can't sidestep or back-pedal out — the only reliable dodge is a dash's i-frames. Attack cooldown 850ms (was 1050 for the 2v1). Cinder Cone deals FIRE (bypasses flat armor); Forge Hammer is PHYSICAL (armor applies) — one fire + one physical attack. Scale 1.8, scored as an elite kill. Regens 12 HP/s while deaggro'd. On death, its shielded Ember Deposits crack open into mineable Cinderforged Ore.",
  },
  {
    name: "The Duneshaper (BADLANDS BOSS)",
    hp: 2500,
    speed: 48,
    aggro: 300,
    attacks: [
      { label: "Gloam Volley (6 beam-like magic bolts, ±9° tight fan, 460px/s — projectiles)", damage: 22, telegraphMs: 420 },
      { label: "Sand Spikes (5-circle CROSS, tracks then locks; PHYSICAL pierce — armor applies; only a diagonal/dash clears it)", damage: 56, telegraphMs: 780 },
      { label: "Blink Nova (blink to player, radial magic burst 132px)", damage: 50, telegraphMs: 650 },
      { label: "Gloamfire Lance @70% HP (tracking-then-committed SWEEPING magic beam, 360px / ±11°, sweeps ±20° on strike)", damage: 54, telegraphMs: 640 },
      { label: "Sunscorch Barrage @50% HP (7-circle magic carpet)", damage: 34, telegraphMs: 1100 },
    ],
    loot: "5-8 Ember Shard + 1 Tyrant Trophy (guaranteed Mythic, Tier 2) + 1 Duneshaper's Heart (gates the Gemwright's ability-jewelry tier) — all reachable since B3-P4d moved the win-con to the Miretyrant",
    notes:
      "SUNSCORCH BADLANDS FINAL BOSS. NO LONGER THE WIN-CONDITION as of B3-P4d — the bayou's Miretyrant took that role and demoted this to a mid-progression big boss, exactly as biome 2 demoted the Gremlin King; killing it no longer ends the run, which is what finally makes its Heart obtainable. PB17 (the user): HP 1250→2500 (≥2× tankier — a real endurance fight) and poise 170→400 (scaled MORE than the HP bump so it staggers genuinely less often, not just over a longer fight). Poise 400 (stagger → 1.35× dmg for 2.2s). Scale 2.3. 2026-07-15: physical weakness REMOVED and the magic resist DROPPED (the user: fire is a magic subtype + the Ember Brand deals fire — resisting magic while fire-weak was contradictory). Its ONLY resistance line now is FIRE ×1.25 (weak); everything else neutral — burning it down (Ember Brand / Emberblink / Molten set-bonus fire) is the intended counter. Phase-gated ESCALATION: 3 attacks at full HP, +Gloamfire Lance at 70% HP, +Sunscorch Barrage AND enrage timing at 50% HP. A caster — holds ~220px and casts, magic attacks bypass flat armor, only Sand Spikes is physical. Summoned by offering an Effigy of the Duneshaper at any of the 3 badlands Tyrant Altars (crafting the effigy reveals them all on the map). Regens 14 HP/s while deaggro'd. S3 (the user: felt easier than the mid-boss): HP 1050→1250; ATTACK_COOLDOWN 900→700ms; the LANCE now tracks the player through 60% of the wind-up then commits + SWEEPS ±20° on the strike (was locked at telegraph start — trivially sidesteppable); Sand Spikes reworked from 3 spaced circles to a tracked 5-circle CROSS (distinct from the Hexling, only a diagonal run/dash clears it).",
  },
  {
    name: "The Miretyrant (FINAL BOSS)",
    hp: 3200,
    speed: 66,
    aggro: 330,
    attacks: [
      { label: "Lunging Chomp (locked-heading gap-closer + jaw snap, 300px lunge / 74px snap — step off the LINE)", damage: 52, telegraphMs: 600 },
      { label: "Tail Sweep (rear-to-front arc, 165px / ±120° — dodge by DISTANCE or dash through, a sidestep won't clear it)", damage: 46, telegraphMs: 700 },
      { label: "Muck Slam (radial AoE under itself, 150px, growing telegraph)", damage: 58, telegraphMs: 820 },
      { label: "Death Roll @65% HP (travelling multi-hit spin along a locked line, 300px/s for 900ms, can re-hit every 420ms — outrun it ACROSS, never along)", damage: 40, telegraphMs: 780 },
      { label: "Bellow (own 15s timer, 8.5s enraged — surfaces 3 adds, 5 enraged; max 8 concurrent). Not damage: the adds are the attack.", damage: 0, telegraphMs: 700 },
    ],
    loot: "8-12 Gloam Shard + 1 Tier-2 Boss Trophy (unreachable in practice — this kill wins the run)",
    notes:
      "DUSKMIRE BAYOU FINAL BOSS + WIN-CONDITION (B3-P4d), demoting the Duneshaper to a mid-boss. Fought at the bottom of the Sunken Gorge — its own boss dungeon (approach rooms + one 832×576 arena), unsealed by offering an Effigy of the Miretyrant at the maw. A BRUISER, deliberately the opposite of the caster Duneshaper: it closes to ~96px and stays there, and every dodge is a spacing dodge. Poise 450 (stagger → 1.35× for 2.2s), scale 2.6, regens 16 HP/s deaggro'd, leash 620 (no arena seal — you can always retreat, and it resets). Resistances: slash ×0.8, blunt ×1.2, poison ×0.25 — a thick swamp hide that folds to a warhammer, deliberately NOT the Duneshaper's fire-weakness so the two finales reward different loadouts. Phases: +Death Roll at 65% HP, enrage timing (0.75× telegraph/recovery, 1.25× move) + halved bellow interval at 35%.",
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

  html += `<h3>Gem augments (per gear instance)</h3>
    <p class="note">Biome-3 Phase 3 (<code>src/systems/GearAugments.ts</code>). Applied via a
    gear item's right-click Upgrade panel, <b>no ladder</b> (any order) and <b>consumed</b> —
    max <b>${MAX_AUGMENTS_PER_ITEM}</b> per instance. Independent of the item's Lvl 2/3 tier
    upgrades, so a piece can carry both.</p>
    <table><thead><tr>
    <th>Augment</th><th>Fits</th><th>Effect</th><th>Cost</th><th>Description</th>
    </tr></thead><tbody>`;
  for (const a of GEAR_AUGMENTS) {
    const fits = a.appliesToItemKeys.some((k) => itemDef(k)?.weapon) ? "Weapons" : "Armor";
    html += `<tr>
      <td><b>${esc(a.name)}</b></td>
      <td><span class="tag">${fits}</span></td>
      <td class="pos">${esc(a.deltaLabel)}</td>
      <td class="cost">${esc(costsText(a.costs))}</td>
      <td class="muted">${esc(a.description)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
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

// All melee weapons in progression order (ranged handled separately below).
const MELEE_WEAPONS: WeaponType[] = [
  "wood_club",
  "stone_club",
  "bone_knife",
  "primal_spear",
  "sunsteel_warhammer",
  "sunsteel_sword",
  "sunsteel_pike",
  "embersteel_warhammer",
  "embersteel_sword",
  "embersteel_pike",
  "ember_brand",
  "gloamsteel_warhammer",
  "gloamsteel_sword",
  "gloamsteel_pike",
  "gloam_brand",
  "gloamdrinker",
];

function renderWeapons(): string {
  const weapons: WeaponType[] = MELEE_WEAPONS;
  let html = `<h2>Weapons</h2>
    <p class="note">Base stats from <code>Weapons.ts</code>; upgrade tiers from
    <code>WeaponUpgrades.ts</code>. <b>DPS</b> = damage × attacks/sec (before the
    weapon-skill damage multiplier of +0.5%/level). <b>Base crit</b> is the
    per-weapon floor (M-SS) — Agility adds chance, Strength adds multiplier, both
    all-weapon; <b>eff. DPS</b> folds base crit into Lvl 1 DPS
    (×(1 + chance×(mult−1))). <b>Arc</b> is the AOE sweep (±half-angle / range px /
    falloff) — a swing hits its primary target, then sweeps others in the cone.
    <b>Stamina/hit</b> gates sustained swinging against the 100 base stamina pool.</p>
    <p class="note"><b>S7 weapon identities:</b>
    <span class="tag">Slash</span> knife/sword = widest arc, best crowd AOE ·
    <span class="tag">Pierce</span> spear/pike = top single-target &amp; best crit, narrow arc ·
    <span class="tag">Blunt</span> club/warhammer = medium arc + <b>movement-slow debuff</b>
    (${Math.round((1 - BLUNT_SLOW_FACTOR) * 100)}% slower for ${round1(BLUNT_SLOW_MS / 1000)}s, drives <code>Enemy.applySlow</code>).</p>
    <table><thead><tr>
      <th>Weapon</th><th>Type</th><th class="num">Lvl 1 dmg</th><th class="num">Lvl 2</th>
      <th class="num">Lvl 3</th><th class="num">Atk/s</th><th class="num">Lvl 1 DPS</th>
      <th class="num">Lvl 3 DPS</th><th class="num">Base crit</th>
      <th class="num">Eff. DPS</th><th class="num">Arc</th><th class="num">Stam/hit</th>
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
    const arc = weaponArc(w);
    const arcText = arc.range > 0 ? `±${arc.halfAngleDeg}° / ${arc.range}px / ${round1(arc.falloff)}` : "—";
    html += `<tr title="${esc(weaponIdentityLine(w))}">
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
      <td class="num">${arcText}</td>
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

  html += `<h3>Tool upgrade costs</h3>
    <p class="note">In-place tool upgrades (<code>ToolUpgrades.ts</code>) — right-click
    the tool. The tier gates felling higher-hardness nodes (<code>ResourceNode.minToolTier</code>),
    e.g. the badlands Ironbark tree needs the Ironshod axe.</p>
    <table><thead><tr>
    <th>Tool</th><th>Upgrade</th><th>Result</th><th>Effect</th><th>Cost</th>
    </tr></thead><tbody>`;
  for (const u of TOOL_UPGRADES) {
    html += `<tr>
      <td>${esc(name(u.appliesToItemKey))}</td>
      <td>${esc(u.name)}</td>
      <td><span class="tag tier1">Lvl ${u.resultTier + 1}</span></td>
      <td>${esc(u.deltaLabel ?? "—")}</td>
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
    <code>Cooking.ts</code>. <b>No ladder:</b> any discovered station upgrade can be
    applied in any order — each just bumps the station's level by <b>+1</b> (level =
    count of upgrades applied). Recipes/dishes gate on that level count; material
    requirements come from a recipe's own ingredient discovery.</p>`;

  html += `<h3>Station upgrades</h3><table><thead><tr>
    <th>Station</th><th>Upgrade</th><th>Grants</th><th>Effect</th><th>Cost</th>
    </tr></thead><tbody>`;
  for (const u of STATION_UPGRADES) {
    html += `<tr>
      <td>${esc(name(u.appliesToItemKey))}</td>
      <td>${esc(u.name)}</td>
      <td><span class="tag tier1">+1 level</span></td>
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
      <td>${c.requiredCampfireTier >= 1 ? `<span class="tag tier1">Lvl ${c.requiredCampfireTier + 1}</span>` : '<span class="tag">any</span>'}</td>
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
    up. A relic's power tier always equals the trophy's tier — biome-1 trophies are Tier 1,
    badlands elite trophies are <b>Tier 2</b> (×1.5 magnitude, Phase 5). The run's <b>first
    roll is a guaranteed success</b>; beyond that a per-rarity pity counter guarantees a
    base-rarity success after N misses.</p>
    <p class="note"><b>Family loadout, not stacking.</b> Every relic belongs to one of 8
    <b>families</b> and a player holds at most one relic per family. Rolling into an owned
    family resolves by <b>rarity, then power tier</b> (2026-07-15 redesign — one curated relic
    per rarity per family, so higher rarity is always a strict upgrade): higher rarity
    <b>auto-replaces</b>, lower <b>auto-declines</b>. Discarding the just-rolled relic refunds
    <b>50% of its trophy's shard cost</b> (raw trophies free → 0; refined → 1 shard).
    <b>Single-family + unique procs:</b> Common/Uncommon are a small flat stat that
    <b>plateaus at Uncommon</b>; Rare/Mythic reuse that stat and add a bespoke conditional
    proc (the effect text below shows both) — so a relic is never a growing damage/HP
    multiplier, and all buff categories are additive-within-category (no exponential
    compounding).</p>`;

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
    mirejaw_trophy: "Elite Mirejaw (bayou)",
    blighttoad_trophy: "Elite Blighttoad (bayou)",
    mosswretch_trophy: "Elite Mosswretch (bayou)",
    murkling_trophy: "Elite Murkling (bayou)",
    fenlurker_trophy: "Elite Fenlurker (bayou)",
    corpselight_trophy: "Elite Corpselight (bayou)",
    gremlin_king_fang: "Retired — the King now drops the Gremlin King's Heart (a Phase-4 smelting material) + the Boss Trophy, not this",
    boss_refined_trophy: "Gremlin King (S4) — guaranteed Mythic, Tier 1, never fails; B3-P5: offers a CHOICE of 3 Mythics",
    boss_refined_trophy_t2: "The Duneshaper (S4) — guaranteed Mythic, Tier 2 (×1.5), never fails; B3-P5: offers a CHOICE of 3 Mythics",
    refined_trophy_uncommon: "Refinement (Gloaming Vein, Gloam Shards) — roll-only",
    refined_trophy_uncommon_t2: "Refinement (badlands, Ember Shards) — roll-only",
    refined_trophy_rare: "Refinement (scaffold) — roll-only",
  };
  for (const [key, roll] of Object.entries(TROPHY_ROLL)) {
    // A trophy's maxRarity caps its produced rarity (refined trophies can't roll
    // Mythic) — merge any capped-out band down into the cap rarity so the shown
    // odds match Relics.roll()'s clamp.
    const capIdx = roll.maxRarity ? RELIC_RARITIES.indexOf(roll.maxRarity) : Infinity;
    const bands: { rarity: typeof RELIC_RARITIES[number]; chance: number }[] = [];
    // A trophy may carry a bespoke outcomeOdds override (the Boss Trophy) —
    // prefer it over the shared per-rarity table, matching Relics.roll().
    for (const b of roll.outcomeOdds ?? TROPHY_OUTCOME_ODDS[roll.rarity]) {
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

  // Trophy refinement (Gloaming Vein / Ember Kiln) — spend shards to climb a
  // raw trophy one rarity up into a guaranteed-roll refined trophy.
  html += `<h3>Trophy refinement — Gloaming Vein / Ember Kiln</h3>
    <p class="note">The Relic Forge's <b>Refine tab</b> (Lvl 2, Gloam Conduit) spends shards
    to climb a raw trophy one rarity up into a <b>refined trophy that never crumbles</b>.
    Single-step + terminal (refined trophies are never a refine input); species-agnostic;
    requires trophy tier == shard tier. Biome-1 (Tier 1) trophies refine with <b>Gloam
    Shards</b>; badlands (Tier 2) trophies refine with <b>Ember Shards</b> instead — the
    Relic Forge's <b>Convert tab</b> (Lvl 3, Ember Kiln) renders
    <b>${GLOAM_TO_EMBER_RATIO} Gloam Shards → 1 Ember Shard</b>, one click per conversion.</p>
    <table><thead><tr>
      <th>Input trophies</th><th class="num">Tier</th><th>Shards</th><th>Output</th><th class="muted">Notes</th>
      </tr></thead><tbody>`;
  for (const r of REFINE_RECIPES) {
    // "Live" if at least one currently-dropped raw trophy matches this
    // recipe's rarity + tier (mirrors Relics.ts refinableTrophyKeys, without
    // needing a live backpack — the dashboard just checks the static table).
    const live = Object.keys(TROPHY_ROLL).some(
      (k) => !k.startsWith("refined_") && TROPHY_ROLL[k].rarity === r.inputRarity && TROPHY_ROLL[k].powerTier === r.tier,
    );
    const shardDef = ITEM_DEFS[r.shardKey];
    html += `<tr>
      <td>${r.inputCount} × ${rarityName(r.inputRarity)} T${r.tier} (any species)</td>
      <td class="num">${r.tier}</td>
      <td>${r.shardCount} ${esc(shardDef?.name ?? r.shardKey)}</td>
      <td><b>${esc(name(r.output))}</b></td>
      <td class="muted">${live ? "live" : "scaffold — no raw source yet"}</td>
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
    html += `<table data-table="relics"><thead><tr><th>Relic</th><th>Family</th><th>Effect (Power Tier 1)</th></tr></thead><tbody>`;
    for (const id of ids) {
      const def = RELIC_DEFS[id];
      html += `<tr data-search="${esc((def.name + " " + def.family + " " + relicEffectText(def)).toLowerCase())}">
        <td><span class="dot" style="background:${rarityHex(rarity)}"></span><b>${esc(def.name)}</b></td>
        <td class="muted">${esc(relicFamilyName(def.family))}</td>
        <td class="pos">${esc(relicEffectText(def))}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `<p class="note">A player holds <b>at most one relic per family</b> (Phase 5) — a
    new roll into an owned family auto-replaces if strictly better, auto-declines if strictly
    worse/equal, or prompts a Keep New / Keep Old choice if neither dominates (e.g. a differing
    secondary stat on a dual-stat relic). Discarding the just-rolled relic refunds 50% of its
    trophy's shard cost (raw = 0, refined = 1); displacing the old relic on an upgrade refunds nothing.</p>`;
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
  const weapons: WeaponType[] = MELEE_WEAPONS;
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

// Start-of-run characters (B4-P1) — imported live from Characters.ts, so the
// roster and its trade-offs can never drift from what the picker offers.
function renderCharacters(): string {
  let html = `<h2>Start-of-Run Characters</h2>
    <p class="note">The fixed roster offered at the start of every run
    (<code>Characters.ts</code>). Each card grants stats, a kit, and one
    ability-granting special item pre-equipped in its slot. The run modifier is
    always double-edged and deliberately has <b>no</b> score effect.</p>
    <div class="searchwrap"><input type="search" data-filter="characters" placeholder="Filter characters…" /></div>
    <table data-table="characters"><thead><tr>
      <th>Character</th><th>Ability item</th><th>Stats</th><th>Kit</th>
      <th>Modifier</th><th>Boon</th><th>Bane</th>
      </tr></thead><tbody>`;
  for (const c of CHARACTER_DEFS) {
    const equip = c.startingEquip.map((e) => `${itemDef(e.key)?.name ?? e.key} (${e.slot})`).join(", ");
    const stats = Object.entries(c.startingStats)
      .map(([s, n]) => `+${n} ${s}`)
      .join(", ");
    const kit = c.startingItems.map((i) => `${i.count}x ${itemDef(i.key)?.name ?? i.key}`).join(", ");
    html += `<tr data-search="${esc((c.name + " " + c.id + " " + c.modifier.name).toLowerCase())}">
      <td><b>${esc(c.name)}</b><div class="muted">${esc(c.blurb)}</div></td>
      <td>${esc(equip)}</td>
      <td>${esc(stats || "—")}</td>
      <td>${esc(kit || "—")}</td>
      <td><span class="tag">${esc(c.modifier.name)}</span></td>
      <td>${esc(c.modifier.boon)}</td>
      <td class="muted">${esc(c.modifier.bane)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

// Epic loot + abilities (B4-P2) — imported live from EpicLoot.ts / Abilities.ts,
// so pool membership, drop chances and every ability's power/cooldown stay
// drift-free. This is the one place the lesser-vs-full comparison is legible
// side by side, which is exactly what needs tuning first.
function renderEpicLoot(): string {
  const pools: { label: string; pool: EpicPool; where: string }[] = [
    { label: "Tier 1", pool: EPIC_POOL_T1, where: "Gremlin Shack" },
    { label: "Tier 2", pool: EPIC_POOL_T2, where: "Duskrunner Warren · Sunken Shrine bowl · Lodge hut" },
    { label: "Tier 3", pool: EPIC_POOL_T3, where: "Sunken Crypt chest · Lodge chieftain's hut" },
  ];
  let html = `<h2>Epic Loot</h2>
    <p class="note">Found-only items. One roll per container per empty-cycle (never
    two at once), tiered by POI depth so a shallow chest can't produce a deep
    item. Each tier is a <b>superset</b> of the one above it. Craftable nowhere.</p>
    <table><thead><tr><th>Pool</th><th>Chance</th><th>Containers</th><th>Contents</th></tr></thead><tbody>`;
  for (const { label, pool, where } of pools) {
    const names = pool.keys.map((k) => itemDef(k)?.name ?? k).join(", ");
    html += `<tr>
      <td><b>${esc(label)}</b></td>
      <td>${(pool.chance * 100).toFixed(0)}%</td>
      <td class="muted">${esc(where)}</td>
      <td>${esc(names)}</td>
    </tr>`;
  }
  html += `</tbody></table>
    <h2>Abilities</h2>
    <p class="note">A def's <code>family</code> picks the effect MainScene runs and
    <code>power</code> scales every magnitude it reads — that's what lets a lesser
    and a full version of one effect coexist as pure data. Cooldown is
    <b>not</b> scaled by power; it's set per def.</p>
    <div class="searchwrap"><input type="search" data-filter="epic" placeholder="Filter abilities…" /></div>
    <table data-table="epic"><thead><tr>
      <th>Ability</th><th>Family</th><th>Power</th><th>Cooldown</th><th>Active</th><th>Source</th>
      </tr></thead><tbody>`;
  for (const def of Object.values(ABILITY_DEFS)) {
    const granting = Object.values(ITEM_DEFS).find((i) => i.grantsAbility === def.id);
    const source = def.id.endsWith("_lesser")
      ? "Run-start character"
      : granting && EPIC_ITEM_KEYS.has(granting.key)
        ? "Epic loot (T3)"
        : "Gemwright's Table";
    html += `<tr data-search="${esc((def.name + " " + def.family + " " + source).toLowerCase())}">
      <td><b>${esc(def.name)}</b><div class="muted">${esc(def.description)}</div></td>
      <td>${esc(def.family)}</td>
      <td>${def.power.toFixed(2)}x</td>
      <td>${(def.cooldownMs / 1000).toFixed(1)}s</td>
      <td>${def.activeMs ? `${((def.activeMs * def.power) / 1000).toFixed(1)}s` : "—"}</td>
      <td class="muted">${esc(source)}</td>
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
  { id: "characters", label: "Characters", render: renderCharacters },
  { id: "epic", label: "Epic Loot", render: renderEpicLoot },
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
