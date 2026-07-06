import { RECIPES, type Recipe } from "./Recipes";
import type { ResourceType } from "./Inventory";
import type { ItemContainer } from "./ItemContainer";
import type { Skills } from "./Skills";

// Tracks which recipes the player has unlocked. A recipe unlocks once its
// ingredient item types have all been discovered (picked up at least once)
// AND its required skill level is met. Undiscovered recipes are never shown
// or hinted at, matching the "don't reveal locked info" rule used for
// tool-gated resource nodes.
export class Crafting {
  private discoveredIds = new Set<string>();

  // Call after any resource pickup or skill level-up — cheap no-op if
  // nothing newly qualifies. Returns the recipes that unlocked on THIS call
  // so the caller can announce them in the event log.
  refresh(discoveredItems: ReadonlySet<string>, skills: Skills): Recipe[] {
    const newlyUnlocked: Recipe[] = [];
    for (const recipe of RECIPES) {
      if (this.discoveredIds.has(recipe.id)) continue;
      if (this.ingredientsKnown(recipe, discoveredItems) && this.skillMet(recipe, skills)) {
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

  private skillMet(recipe: Recipe, skills: Skills): boolean {
    if (!recipe.requiredSkill) return true;
    return skills.get(recipe.requiredSkill.skill) >= recipe.requiredSkill.level;
  }
}
