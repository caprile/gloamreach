import type { ResourceType } from "./Inventory";

// The game's first "processing" concept, deliberately distinct from Crafting's
// instant spend-resources-get-item model: a processing station loads a raw
// input item, then converts it into an output item *over time* (a batch every
// `durationMsPerOutput`). Framework-light like Stamina/Biome — no Phaser
// dependency, owns no GameObjects; MainScene ticks it and the DryingRackMenu
// renders it. Architected for reuse (a future campfire-cooking flow could share
// this), not hardcoded to the Drying Rack.

export interface ProcessRecipe {
  input: ResourceType;
  output: ResourceType;
  inputPerOutput: number; // input units consumed per one output unit produced
  durationMsPerOutput: number; // real time to dry one output unit
}

// Ratios locked in the plan (2:1 cattail→twine, 1:1 skin→leather); durations
// are a first-pass tuning call (unset in the plan).
export const PROCESS_RECIPES: ProcessRecipe[] = [
  { input: "cattail", output: "twine", inputPerOutput: 2, durationMsPerOutput: 3000 },
  { input: "gremlin_skin", output: "gremlin_leather", inputPerOutput: 1, durationMsPerOutput: 4000 },
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

// One placed station's live state: what's loaded, what's dried and ready to
// collect, and progress toward the next batch. One station holds one input
// type at a time (its recipe is derived from the loaded input).
export class ProcessingStation {
  input: ProcSlot | null = null;
  output: ProcSlot | null = null;
  private progressMs = 0;

  // Can this station accept `key` right now? Only a valid input, and only when
  // it isn't already busy with a different input type or holding a different
  // output that must be collected first.
  canAccept(key: string): boolean {
    const recipe = processRecipeFor(key);
    if (!recipe) return false;
    if (this.input && this.input.key !== key) return false;
    if (this.output && this.output.key !== recipe.output) return false;
    return true;
  }

  // Add `count` of `key` to the input slot (assumes canAccept passed).
  addInput(key: string, count: number): void {
    if (this.input && this.input.key === key) this.input.count += count;
    else this.input = { key, count };
  }

  // The total output the loaded input WILL yield — units already dried plus
  // whole units still extractable from the remaining raw input. Drives the
  // live preview box (stays roughly constant as raw converts to dried).
  previewOutput(): ProcSlot | null {
    if (!this.input) return this.output;
    const recipe = processRecipeFor(this.input.key);
    if (!recipe) return this.output;
    const pending = Math.floor(this.input.count / recipe.inputPerOutput);
    const have = this.output?.count ?? 0;
    if (pending + have === 0) return this.output;
    return { key: recipe.output, count: pending + have };
  }

  // Advance drying by `deltaMs`. Produces as many whole batches as the elapsed
  // time allows — so a rack left running while its menu was closed catches up
  // in one tick rather than only ever making one batch per frame.
  tick(deltaMs: number): void {
    if (!this.input) {
      this.progressMs = 0;
      return;
    }
    const recipe = processRecipeFor(this.input.key);
    if (!recipe) return;

    this.progressMs += deltaMs;
    while (
      this.input &&
      this.input.count >= recipe.inputPerOutput &&
      this.progressMs >= recipe.durationMsPerOutput
    ) {
      this.progressMs -= recipe.durationMsPerOutput;
      this.input.count -= recipe.inputPerOutput;
      if (this.input.count <= 0) this.input = null;
      if (this.output && this.output.key === recipe.output) this.output.count += 1;
      else this.output = { key: recipe.output, count: 1 };
    }

    // Don't bank progress toward a batch there's no longer enough input for.
    if (!this.input || this.input.count < recipe.inputPerOutput) this.progressMs = 0;
  }

  isProcessing(): boolean {
    if (!this.input) return false;
    const recipe = processRecipeFor(this.input.key);
    return !!recipe && this.input.count >= recipe.inputPerOutput;
  }

  // Fraction [0,1] toward the next output unit — for the progress bar. 0 when
  // idle (nothing loaded, or not enough input left for another batch).
  progressFraction(): number {
    if (!this.input) return 0;
    const recipe = processRecipeFor(this.input.key);
    if (!recipe || this.input.count < recipe.inputPerOutput) return 0;
    return Math.max(0, Math.min(1, this.progressMs / recipe.durationMsPerOutput));
  }

  // Remove and return the ready output (to move into the backpack), clearing it.
  takeOutput(): ProcSlot | null {
    const out = this.output;
    this.output = null;
    return out;
  }

  // Remove and return any loaded raw input (player pulling items back out),
  // resetting progress.
  takeInput(): ProcSlot | null {
    const inp = this.input;
    this.input = null;
    this.progressMs = 0;
    return inp;
  }
}
