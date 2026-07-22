import type Phaser from "phaser";
import type { Enemy } from "../entities/Enemy";
import type { CryptLayout, CryptRect } from "./CryptLayout";

// What MainScene's UNDERGROUND paths actually need from an interior — the
// player clamp, the room-discovery lighting, the brazier lights, the crypt-nav
// steering, the containment net, the exit-stairs hover and the "don't run
// surface systems down here" gates.
//
// Extracted in B3-P4d session 2, when the Miretyrant's lair became a second
// kind of interior. Everything above was written against SunkenCrypt, but none
// of it is about crypts specifically — it's about being inside a floor plan. A
// boss lair has no theme, no gem, no vault nodes and no chest, so making it a
// SunkenCrypt would have meant a pile of dead fields; sharing this shape
// instead means both interiors get every underground behaviour for free and
// neither has to know the other exists.
export interface DungeonInterior {
  readonly name: string; // shown as the biome label while you're inside
  readonly x: number; // the SURFACE entrance, for the exit fallback
  readonly y: number;
  layout: CryptLayout;
  entryPoint: { x: number; y: number };
  braziers: { x: number; y: number }[];
  // Rooms/corridors the player has set foot in — a crypt is lit by DISCOVERY,
  // not by equipment (the standing 4c lock).
  discovered: Set<CryptRect>;
  exitStairs: Phaser.GameObjects.Image | null;
  enemies: Enemy[];
}
