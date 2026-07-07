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
}

// Ratios locked in the plan: 2:1 cattail->twine, 1:1 skin->leather.
export const PROCESS_RECIPES: ProcessRecipe[] = [
  { input: "cattail", output: "twine", inputPerOutput: 2 },
  { input: "gremlin_skin", output: "gremlin_leather", inputPerOutput: 1 },
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

  // Can this station accept `key` right now? Only a valid input, and only
  // while it isn't already loaded with a different input type.
  canAccept(key: string): boolean {
    const recipe = processRecipeFor(key);
    if (!recipe) return false;
    return !this.input || this.input.key === key;
  }

  // Add `count` of `key` to the input slot (assumes canAccept passed).
  addInput(key: string, count: number): void {
    if (this.input && this.input.key === key) this.input.count += count;
    else this.input = { key, count };
  }

  // How much raw input is loaded right now — the slider's upper bound.
  maxProcessable(): number {
    return this.input?.count ?? 0;
  }

  // What running `amount` units of the loaded input through would yield:
  // the input actually consumed (rounded down to a whole multiple of the
  // recipe's ratio — a partial remainder can't produce a partial output) and
  // the output units produced. Used for the live preview as the slider moves.
  previewFor(amount: number): { consumed: number; output: number } {
    if (!this.input) return { consumed: 0, output: 0 };
    const recipe = processRecipeFor(this.input.key);
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
    const recipe = processRecipeFor(this.input.key);
    if (!recipe) return null;
    const { consumed, output } = this.previewFor(amount);
    if (output <= 0) return null;
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
