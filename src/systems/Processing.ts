import type { ResourceType } from "./Inventory";

// The game's first "processing" concept, deliberately distinct from Crafting's
// instant spend-resources-get-item model: a processing station holds a raw
// input and converts a player-chosen amount of it into an output item, all at
// once on demand (not a spend-and-immediately-receive-the-crafted-item click —
// the input has to be loaded first, and the player picks how much of it to run
// through). Framework-light like Stamina/Biome — no Phaser dependency, owns no
// GameObjects; MainScene ticks nothing here (conversion is instant) and the
// DryingRackMenu renders/drives it. Architected for reuse (a future campfire-
// cooking flow could share this), not hardcoded to the Drying Rack.

export interface ProcessRecipe {
  input: ResourceType;
  output: ResourceType;
  inputPerOutput: number; // input units consumed per one output unit produced
  // Optional second INGREDIENT — the thing that ends up in the output alongside
  // the input (Hex Essence infused into Sunsteel, Moonsilver alloyed into
  // Gloamsteel). Loaded into the station's own reagent slot and consumed by
  // process()/capped by maxPossibleOutput(). Absent for the Drying Rack's plain
  // single-input recipes.
  //
  // This used to be called `fuel` — it was named for its first case (Hex Essence,
  // which really was burned for heat), and B4-P5 then reused it for alloy metal,
  // which is how the menu ended up labelling Moonsilver "Fuel". Ingredient and
  // heat source are now separate fields.
  reagent?: { key: ResourceType; per: number }; // `per` = units consumed per output unit
  // Optional FUEL — what's burned for heat, and is NOT part of the output. Every
  // Smelter recipe takes one (you can't melt metal with nothing burning); the
  // Drying Rack takes none.
  fuel?: { key: ResourceType; per: number };
  // Per-recipe slot captions. Default "Input"/"Reagent" (the fuel slot is always
  // just "Fuel").
  slotLabels?: { input?: string; reagent?: string };
  // Minimum station tier required before this recipe is available (an upgraded
  // Smelter unlocks rare ore). Defaults to 0 = available on a fresh station.
  minStationTier?: number;
}

// Ratios locked in the plan: 2:1 cattail->twine, 1:1 skin->leather,
// 2:1 gremlin_blood->gremlin_guck.
export const PROCESS_RECIPES: ProcessRecipe[] = [
  { input: "cattail", output: "twine", inputPerOutput: 2 },
  { input: "gremlin_skin", output: "gremlin_leather", inputPerOutput: 1 },
  { input: "gremlin_blood", output: "gremlin_guck", inputPerOutput: 2 },
];

// Smelter recipes (biome 2 Phase 4): input + reagent + fuel = ingot. The rare
// ores need a tier-1 Smelter (unlocked with the Gremlin King's Heart).
//
// EVERY smelt burns Wood. Fuel was originally conflated with the reagent (Hex
// Essence filled both roles), which left the B4-P5 alloy recipes smelting with no
// heat source at all. Splitting them makes all four recipes the same shape — one
// input, one reagent, one fuel — so there's no optional slot to special-case, and
// gives Wood a sink that lasts past the early game.
export const SMELT_RECIPES: ProcessRecipe[] = [
  { input: "sunscorch_ore", output: "sunsteel_ingot", inputPerOutput: 1, reagent: { key: "hex_essence", per: 1 }, fuel: { key: "wood", per: 1 }, slotLabels: { input: "Ore", reagent: "Reagent" } },
  { input: "ember_ore", output: "embersteel_ingot", inputPerOutput: 1, reagent: { key: "hex_essence", per: 1 }, fuel: { key: "wood", per: 1 }, slotLabels: { input: "Ore", reagent: "Reagent" }, minStationTier: 1 },
  // Biome 3 Phase 3: bayou ore. Same tier-1 Smelter as rare badlands ore (the
  // Ember Crucible is the "can melt the hard stuff" gate; the bayou doesn't
  // need a second one) — the real gate is finding Bog Ore at all.
  // B4-P5: Gloamsteel's reagent is MOONSILVER, which only comes from crypt vaults
  // behind a warden. That is what rewards the Embersteel route (locked decision
  // 3) — the longer road is the one that needs dungeon clears.
  { input: "bog_ore", output: "gloamsteel_ingot", inputPerOutput: 1, reagent: { key: "moonsilver", per: 1 }, fuel: { key: "wood", per: 1 }, slotLabels: { input: "Ore", reagent: "Alloy" }, minStationTier: 1 },
  // The SUNSTEEL branch metal. Input is the ingot (not the ore) so its recipe
  // key stays unique — two recipes sharing an input would make processRecipeFor
  // ambiguous — and so it reads literally as "Sunsteel + Bog Ore".
  { input: "sunsteel_ingot", output: "mirebronze_ingot", inputPerOutput: 1, reagent: { key: "bog_ore", per: 2 }, fuel: { key: "wood", per: 1 }, slotLabels: { input: "Metal", reagent: "Alloy" }, minStationTier: 1 },
];

export function processRecipeFor(inputKey: string): ProcessRecipe | undefined {
  return PROCESS_RECIPES.find((r) => r.input === inputKey);
}

// True for any item key that some station can process — drives the "valid
// input lights up, everything else dims" affordance in the rack menu.
export function isProcessInput(key: string): boolean {
  return PROCESS_RECIPES.some((r) => r.input === key);
}

export interface ProcSlot {
  key: string;
  count: number;
}

export interface ProcessResult {
  key: string;
  count: number;
}

// Which of a recipe's two secondary ingredients a slot operation refers to.
export type SecondarySide = "reagent" | "fuel";
export const SECONDARY_SIDES: SecondarySide[] = ["reagent", "fuel"];

// One placed station's live state: just whatever raw input is currently
// loaded. Processing itself is instant and stateless (no progress/output slot
// to track between frames) — the player picks how much of the loaded input to
// run, hits Process, and the result is handed straight back to the caller to
// deposit into the backpack (or drop on the floor if it doesn't fit).
export class ProcessingStation {
  input: ProcSlot | null = null;
  // Dedicated secondary slots (S1) — loaded explicitly rather than pulled
  // silently from the backpack, so an "A + B + fuel" station reads as three
  // slots. Both null/unused for the Drying Rack's single-input recipes.
  reagent: ProcSlot | null = null;
  fuel: ProcSlot | null = null;
  // Which recipe table this station runs (Drying Rack = PROCESS_RECIPES, Smelter
  // = SMELT_RECIPES) and its upgrade tier (an upgraded Smelter unlocks rare-ore
  // recipes gated on minStationTier). Both are per-placed-instance, so the same
  // class serves multiple station kinds without a shared global recipe table.
  private readonly recipes: ProcessRecipe[];
  private tier = 0;

  constructor(recipes: ProcessRecipe[] = PROCESS_RECIPES) {
    this.recipes = recipes;
  }

  // Reflect the placed object's upgrade tier (read from its image data by the
  // scene when the menu opens) so tier-gated recipes unlock.
  setTier(tier: number): void {
    this.tier = tier;
  }

  // The recipe for `inputKey` available at this station's current tier, if any.
  private recipeFor(inputKey: string): ProcessRecipe | undefined {
    return this.recipes.find((r) => r.input === inputKey && (r.minStationTier ?? 0) <= this.tier);
  }

  // Can this station accept `key` right now? Only a valid (tier-available) input,
  // and only while it isn't already loaded with a different input type.
  canAccept(key: string): boolean {
    if (!this.recipeFor(key)) return false;
    return !this.input || this.input.key === key;
  }

  // Add `count` of `key` to the input slot (assumes canAccept passed).
  addInput(key: string, count: number): void {
    if (this.input && this.input.key === key) this.input.count += count;
    else this.input = { key, count };
  }

  // --- secondary slots: reagent + fuel (Smelter) ---
  //
  // The two behave identically apart from which recipe field they read and which
  // slot they fill, so everything below routes through one `side` parameter
  // rather than two near-identical copies that can drift apart.

  private slotFor(side: SecondarySide): ProcSlot | null {
    return side === "reagent" ? this.reagent : this.fuel;
  }

  // Does this station run any recipe with this secondary ingredient? Drives
  // whether the menu renders the slot at all — true for the Smelter, false for
  // the Drying Rack. Independent of what's currently loaded, so either can be
  // loaded before the ore.
  usesSlot(side: SecondarySide): boolean {
    return this.recipes.some((r) => !!r[side]);
  }

  // Every key this station accepts in that slot at its current tier. This is
  // PER-RECIPE (B4-P5 gave Gloamsteel moonsilver and Mirebronze bog ore), so a
  // station legitimately accepts several — assuming a single shared key silently
  // made those two recipes unloadable, and therefore impossible to run.
  slotKeys(side: SecondarySide): string[] {
    const keys: string[] = [];
    for (const r of this.recipes) {
      const ing = r[side];
      if (!ing) continue;
      if ((r.minStationTier ?? 0) > this.tier) continue;
      if (!keys.includes(ing.key)) keys.push(ing.key);
    }
    return keys;
  }

  // What the station wants in that slot right now, for the empty-slot hint: the
  // loaded input's own requirement when there is one, else the first it accepts.
  slotKey(side: SecondarySide): string | null {
    const loaded = this.recipeForLoaded();
    if (loaded?.[side]) return loaded[side]!.key;
    return this.slotKeys(side)[0] ?? null;
  }

  // Captions for the input + reagent slots, from the loaded recipe (so the
  // Smelter can call Moonsilver an "Alloy" rather than a generic "Reagent").
  // Falls back to the first available recipe before anything is loaded. The fuel
  // slot is always just "Fuel" — it's the one ingredient that's never part of
  // the output, so it never needs renaming per recipe.
  slotLabels(): { input: string; reagent: string } {
    const r = this.recipeForLoaded() ?? this.recipes.find((x) => x.reagent && (x.minStationTier ?? 0) <= this.tier);
    return { input: r?.slotLabels?.input ?? "Input", reagent: r?.slotLabels?.reagent ?? "Reagent" };
  }

  // Can this station accept `key` in that slot right now? Anything it accepts
  // there, and only while the slot isn't already holding a different item.
  canAcceptInto(side: SecondarySide, key: string): boolean {
    if (!this.slotKeys(side).includes(key)) return false;
    const slot = this.slotFor(side);
    return !slot || slot.key === key;
  }

  addInto(side: SecondarySide, key: string, count: number): void {
    const slot = this.slotFor(side);
    if (slot && slot.key === key) slot.count += count;
    else if (side === "reagent") this.reagent = { key, count };
    else this.fuel = { key, count };
  }

  takeFrom(side: SecondarySide): ProcSlot | null {
    const slot = this.slotFor(side);
    if (side === "reagent") this.reagent = null;
    else this.fuel = null;
    return slot;
  }

  // True if `key` goes in EITHER secondary slot — the "compatible materials"
  // filter doesn't care which.
  canAcceptSecondary(key: string): boolean {
    return this.canAcceptInto("reagent", key) || this.canAcceptInto("fuel", key);
  }

  // How much raw input is loaded right now — the slider's upper bound.
  maxProcessable(): number {
    return this.input?.count ?? 0;
  }

  // The recipe currently governing the loaded input, if any — lets callers
  // (the rack UI) read the output key/ratio without re-deriving it from a
  // hardcoded input-key switch.
  recipeForLoaded(): ProcessRecipe | undefined {
    return this.input ? this.recipeFor(this.input.key) : undefined;
  }

  // Empty every loaded slot and return what was in them, so the caller can hand
  // it back to the player (on menu close) or drop it (on destroy). Instant,
  // stateless processing means nothing should ever be stranded in a station.
  drainAll(): ProcSlot[] {
    const out: ProcSlot[] = [];
    for (const slot of [this.input, this.reagent, this.fuel]) if (slot) out.push(slot);
    this.input = null;
    this.reagent = null;
    this.fuel = null;
    return out;
  }

  // How many whole output units the loaded input could ever produce — the
  // slider's upper bound now that it represents desired output, not raw
  // input units (a partial remainder can't produce a partial output). A Smelter
  // recipe is additionally capped by BOTH loaded secondaries, so the slider can
  // never ask for more than the reagent and fuel between them cover.
  maxPossibleOutput(): number {
    const recipe = this.recipeForLoaded();
    if (!recipe || !this.input) return 0;
    let max = Math.floor(this.input.count / recipe.inputPerOutput);
    for (const side of SECONDARY_SIDES) {
      const need = recipe[side];
      if (!need) continue;
      const slot = this.slotFor(side);
      const have = slot && slot.key === need.key ? slot.count : 0;
      max = Math.min(max, Math.floor(have / need.per));
    }
    return Math.max(0, max);
  }

  // What running `amount` units of the loaded input through would yield:
  // the input actually consumed (rounded down to a whole multiple of the
  // recipe's ratio — a partial remainder can't produce a partial output) and
  // the output units produced. Used for the live preview as the slider moves.
  previewFor(amount: number): { consumed: number; output: number } {
    if (!this.input) return { consumed: 0, output: 0 };
    const recipe = this.recipeFor(this.input.key);
    if (!recipe) return { consumed: 0, output: 0 };
    const clamped = Math.max(0, Math.min(Math.floor(amount), this.input.count));
    const consumed = clamped - (clamped % recipe.inputPerOutput);
    return { consumed, output: consumed / recipe.inputPerOutput };
  }

  // Instantly convert `amount` units of the loaded input. Returns the
  // produced output (null if nothing could be produced, e.g. amount rounds
  // down to 0). Draining the input slot to 0 clears it.
  process(amount: number): ProcessResult | null {
    if (!this.input) return null;
    const recipe = this.recipeFor(this.input.key);
    if (!recipe) return null;
    const { consumed, output } = this.previewFor(amount);
    if (output <= 0) return null;
    // A Smelter recipe draws its reagent and fuel from the loaded slots (not the
    // backpack). maxPossibleOutput already caps the slider by both, but re-guard
    // here — and check BOTH before spending EITHER, so a run that can't cover its
    // fuel doesn't silently eat the reagent on the way to returning null.
    for (const side of SECONDARY_SIDES) {
      const need = recipe[side];
      if (!need) continue;
      const slot = this.slotFor(side);
      if (!slot || slot.key !== need.key || slot.count < output * need.per) return null;
    }
    for (const side of SECONDARY_SIDES) {
      const need = recipe[side];
      if (!need) continue;
      const slot = this.slotFor(side)!;
      slot.count -= output * need.per;
      if (slot.count <= 0) this.takeFrom(side);
    }
    this.input.count -= consumed;
    if (this.input.count <= 0) this.input = null;
    return { key: recipe.output, count: output };
  }

  // Pull the loaded raw input back out (player retrieving unprocessed
  // material), clearing the slot.
  takeInput(): ProcSlot | null {
    const inp = this.input;
    this.input = null;
    return inp;
  }
}
