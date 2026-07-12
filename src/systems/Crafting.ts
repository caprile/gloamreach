import { RECIPES, type Recipe } from "./Recipes";
import type { ResourceType } from "./Inventory";
import type { ItemContainer } from "./ItemContainer";
import type { Skills } from "./Skills";

// Tracks which recipes the player has unlocked. A recipe unlocks once its
// ingredient item types have all been discovered (picked up at least once)
// AND its required skill level(s) are met. Undiscovered recipes are never
// shown or hinted at, matching the "don't reveal locked info" rule used for
// tool-gated resource nodes — a skill-gated recipe (e.g. stone_club at
// blunt lvl 3) stays fully invisible until the skill is actually there, same
// treatment as an ingredient the player hasn't discovered yet.
export class Crafting {
  private discoveredIds = new Set<string>();

  // Call after any resource pickup, skill level-up, or workbench placement —
  // cheap no-op if nothing newly qualifies. Returns the recipes that
  // unlocked on THIS call so the caller can announce them in the event log.
  // `workbenchPlaced` gates tier 1+ recipes from even appearing until the
  // player has placed a Workbench at least once (separate from — and prior
  // to — the *currently near a workbench* check that gates actually
  // crafting/placing an already-discovered recipe).
  refresh(discoveredItems: ReadonlySet<string>, skills: Skills, workbenchPlaced: boolean): Recipe[] {
    const newlyUnlocked: Recipe[] = [];
    for (const recipe of RECIPES) {
      if (this.discoveredIds.has(recipe.id)) continue;
      if (recipe.tier > 0 && !workbenchPlaced) continue;
      if (
        this.ingredientsKnown(recipe, discoveredItems) &&
        this.skillsMet(recipe, skills) &&
        this.otherRecipesDiscovered(recipe, discoveredItems)
      ) {
        this.discoveredIds.add(recipe.id);
        newlyUnlocked.push(recipe);
      }
    }
    return newlyUnlocked;
  }

  discoveredRecipes(): Recipe[] {
    return RECIPES.filter((r) => this.discoveredIds.has(r.id));
  }

  canAfford(recipe: Recipe, backpack: ItemContainer): boolean {
    return (Object.entries(recipe.costs) as [ResourceType, number][]).every(
      ([resource, amount]) => backpack.count(resource) >= amount,
    );
  }

  // Deducts the ingredient cost from the backpack. Returns whether it ran.
  // The caller is responsible for checking output room first and adding the
  // crafted item.
  craft(recipe: Recipe, backpack: ItemContainer): boolean {
    if (!this.canAfford(recipe, backpack)) return false;
    for (const [resource, amount] of Object.entries(recipe.costs) as [ResourceType, number][]) {
      backpack.removeCount(resource, amount);
    }
    return true;
  }

  private ingredientsKnown(recipe: Recipe, discovered: ReadonlySet<string>): boolean {
    return (Object.keys(recipe.costs) as ResourceType[]).every((r) => discovered.has(r));
  }

  private skillsMet(recipe: Recipe, skills: Skills): boolean {
    return (recipe.requiredSkills ?? []).every((req) => skills.get(req.skill) >= req.level);
  }

  // requiresDiscovered lists item KEYS (not recipe ids) that must already be
  // in the discovered-items set — the same set ingredientsKnown reads, which
  // covers crafted outputs too (addToBackpack discovers every key it adds).
  private otherRecipesDiscovered(recipe: Recipe, discovered: ReadonlySet<string>): boolean {
    return (recipe.requiresDiscovered ?? []).every((key) => discovered.has(key));
  }
}
