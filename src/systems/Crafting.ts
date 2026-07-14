import { RECIPES, type Recipe } from "./Recipes";
import type { ResourceType } from "./Inventory";
import type { ItemContainer } from "./ItemContainer";
import type { Skills } from "./Skills";
import { EQUIP_SLOTS, type Equipment } from "./Equipment";

// Tracks which recipes the player has unlocked. A recipe unlocks once its
// ingredient item types have all been discovered (picked up at least once)
// AND its required skill level(s) are met. Undiscovered recipes are never
// shown or hinted at, matching the "don't reveal locked info" rule used for
// tool-gated resource nodes — a skill-gated recipe (e.g. stone_club at
// blunt lvl 3) stays fully invisible until the skill is actually there, same
// treatment as an ingredient the player hasn't discovered yet.
export class Crafting {
  private discoveredIds = new Set<string>();
  // Optional worn-equipment reference so a recipe ingredient (e.g. the base
  // forged piece a T2 reforge consumes) can be satisfied by an EQUIPPED item,
  // not just the backpack. Set by the scene after construction — a setter
  // rather than a ctor param keeps the two `new Crafting()` sites untouched.
  private equipment?: Equipment;

  setEquipment(equipment: Equipment): void {
    this.equipment = equipment;
  }

  // How many of `key` are currently worn across all equipment slots — armor
  // pieces are qty-1 per slot (ammo carries a count but a recipe never lists
  // ammo as an ingredient, so counting slot-by-slot is fine).
  private equippedCount(key: string): number {
    if (!this.equipment) return 0;
    let n = 0;
    for (const s of EQUIP_SLOTS) {
      if (this.equipment.get(s.id)?.key === key) n += 1;
    }
    return n;
  }

  // Total owned of `key` toward a recipe: backpack + worn equipment. This is
  // what the crafting-menu ingredient readout and affordability check read, so
  // "Emberhide Vest 0/1" correctly counts a Duskhide Vest you have EQUIPPED.
  availableFor(key: string, backpack: ItemContainer): number {
    return backpack.count(key) + this.equippedCount(key);
  }

  // Call after any resource pickup, skill level-up, or workbench placement —
  // cheap no-op if nothing newly qualifies. Returns the recipes that
  // unlocked on THIS call so the caller can announce them in the event log.
  // `workbenchPlaced` gates tier 1+ recipes from even appearing until the
  // player has placed a Workbench at least once (separate from — and prior
  // to — the *currently near a workbench* check that gates actually
  // crafting/placing an already-discovered recipe).
  refresh(
    discoveredItems: ReadonlySet<string>,
    skills: Skills,
    workbenchPlaced: boolean,
    maxWorkbenchTierReached: number,
  ): Recipe[] {
    const newlyUnlocked: Recipe[] = [];
    for (const recipe of RECIPES) {
      if (this.discoveredIds.has(recipe.id)) continue;
      if (recipe.tier > 0 && !workbenchPlaced) continue;
      // A recipe gated on a Workbench tier (Sunsteel@Lvl3, Embersteel@Lvl4)
      // stays hidden until the bench has ACTUALLY been upgraded to that tier —
      // not merely once its ingredients are known. (Crafting it still needs a
      // nearby bench at that tier via MainScene.isNearWorkbenchAtTier.)
      if (recipe.requiresWorkbenchTier !== undefined && maxWorkbenchTierReached < recipe.requiresWorkbenchTier) {
        continue;
      }
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
      ([resource, amount]) => this.availableFor(resource, backpack) >= amount,
    );
  }

  // Deducts the ingredient cost. Returns whether it ran. Prefers the backpack
  // copy, then falls back to unequipping-and-consuming worn pieces (the reforge
  // case: a base forged piece you have equipped counts + can be consumed). The
  // caller is responsible for checking output room first and adding the crafted
  // item. `free` (the DEV `nobuildcost` command) skips both the affordability
  // check and the deduction.
  craft(recipe: Recipe, backpack: ItemContainer, free = false): boolean {
    if (free) return true;
    if (!this.canAfford(recipe, backpack)) return false;
    for (const [resource, amount] of Object.entries(recipe.costs) as [ResourceType, number][]) {
      const fromBackpack = Math.min(backpack.count(resource), amount);
      if (fromBackpack > 0) backpack.removeCount(resource, fromBackpack);
      let remaining = amount - fromBackpack;
      while (remaining > 0 && this.consumeEquipped(resource)) remaining -= 1;
    }
    return true;
  }

  // Remove one worn piece matching `key` (consumed by the recipe — NOT returned
  // to the backpack, it's an ingredient). Returns whether one was found.
  private consumeEquipped(key: string): boolean {
    if (!this.equipment) return false;
    for (const s of EQUIP_SLOTS) {
      if (this.equipment.get(s.id)?.key === key) {
        this.equipment.set(s.id, null);
        return true;
      }
    }
    return false;
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
