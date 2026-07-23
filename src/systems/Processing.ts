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
  // Optional secondary consumable ("A + B = output") — the Smelter's fuel. It's
  // loaded into the station's own dedicated fuel slot (see ProcessingStation.fuel)
  // and burned by process()/capped by maxPossibleOutput(). Absent for the Drying
  // Rack's plain single-input recipes.
  fuel?: { key: ResourceType; per: number }; // `per` = fuel units per output unit
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

// Smelter recipes (biome 2 Phase 4): ore + Hex Essence fuel = ingot. The rare
// ore needs a tier-1 Smelter (unlocked with the Gremlin King's Heart).
// Ratio is 1 ore + 1 hex -> 1 ingot (S1 rebalance — the old 2:1 made forging
// grindy; fuel is deducted from the Smelter's loaded fuel slot, not the backpack).
export const SMELT_RECIPES: ProcessRecipe[] = [
  { input: "sunscorch_ore", output: "sunsteel_ingot", inputPerOutput: 1, fuel: { key: "hex_essence", per: 1 } },
  { input: "ember_ore", output: "embersteel_ingot", inputPerOutput: 1, fuel: { key: "hex_essence", per: 1 }, minStationTier: 1 },
  // Biome 3 Phase 3: bayou ore. Same tier-1 Smelter as rare badlands ore (the
  // Ember Crucible is the "can melt the hard stuff" gate; the bayou doesn't
  // need a second one) — the real gate is finding Bog Ore at all.
  // B4-P5: Gloamsteel's secondary input is now MOONSILVER, which only comes from
  // crypt vaults behind a warden. That is what rewards the Embersteel route
  // (locked decision 3) — the longer road is the one that needs dungeon clears.
  { input: "bog_ore", output: "gloamsteel_ingot", inputPerOutput: 1, fuel: { key: "moonsilver", per: 1 }, minStationTier: 1 },
  // The SUNSTEEL branch metal. Input is the ingot (not the ore) so its recipe
  // key stays unique — two recipes sharing an input would make processRecipeFor
  // ambiguous — and so it reads literally as "Sunsteel + Bog Ore".
  { input: "sunsteel_ingot", output: "mirebronze_ingot", inputPerOutput: 1, fuel: { key: "bog_ore", per: 2 }, minStationTier: 1 },
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

// One placed station's live state: just whatever raw input is currently
// loaded. Processing itself is instant and stateless (no progress/output slot
// to track between frames) — the player picks how much of the loaded input to
// run, hits Process, and the result is handed straight back to the caller to
// deposit into the backpack (or drop on the floor if it doesn't fit).
export class ProcessingStation {
  input: ProcSlot | null = null;
  // Dedicated fuel slot (S1) — the Smelter's Hex Essence is loaded here rather
  // than pulled silently from the backpack, so an "A + B = output" station reads
  // as two explicit slots. Null/unused for fuel-less stations (the Drying Rack).
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

  // --- fuel slot (Smelter) ---

  // Does this station run any fuelled ("A + B = output") recipe? Drives whether
  // the menu renders a fuel slot at all — true for the Smelter, false for the
  // Drying Rack. Independent of what's currently loaded so fuel can be loaded
  // before ore.
  usesFuelSlot(): boolean {
    return this.recipes.some((r) => !!r.fuel);
  }

  // The fuel item key this station burns (all its fuelled recipes share one —
  // the Smelter's Hex Essence), for the empty-slot hint. Null if fuel-less.
  fuelKey(): string | null {
    return this.recipes.find((r) => r.fuel)?.fuel?.key ?? null;
  }

  // Can this station accept `key` as fuel right now? Only its fuel key, and only
  // while the fuel slot isn't already holding a different item.
  canAcceptFuel(key: string): boolean {
    if (this.fuelKey() !== key) return false;
    return !this.fuel || this.fuel.key === key;
  }

  addFuel(key: string, count: number): void {
    if (this.fuel && this.fuel.key === key) this.fuel.count += count;
    else this.fuel = { key, count };
  }

  takeFuel(): ProcSlot | null {
    const f = this.fuel;
    this.fuel = null;
    return f;
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

  // How many whole output units the loaded input could ever produce — the
  // slider's upper bound now that it represents desired output, not raw
  // input units (a partial remainder can't produce a partial output). A fuelled
  // recipe (Smelter) is additionally capped by the loaded fuel, so the slider
  // can never ask for more than the fuel slot covers.
  maxPossibleOutput(): number {
    const recipe = this.recipeForLoaded();
    if (!recipe || !this.input) return 0;
    let max = Math.floor(this.input.count / recipe.inputPerOutput);
    if (recipe.fuel) {
      const fuelHave = this.fuel && this.fuel.key === recipe.fuel.key ? this.fuel.count : 0;
      max = Math.min(max, Math.floor(fuelHave / recipe.fuel.per));
    }
    return max;
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
    // A fuelled recipe burns fuel from the loaded slot (not the backpack).
    // maxPossibleOutput already caps the slider by fuel, but re-guard here.
    if (recipe.fuel) {
      const need = output * recipe.fuel.per;
      if (!this.fuel || this.fuel.key !== recipe.fuel.key || this.fuel.count < need) return null;
      this.fuel.count -= need;
      if (this.fuel.count <= 0) this.fuel = null;
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
