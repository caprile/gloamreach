// Contextual "tip" system — a Valheim-hint-style nudge that fires the FIRST
// time the player hits a given situation each run, then never again that run.
// Deliberately sparse and non-hand-holdy: it teaches controls and points at
// mechanics, but never spells out the win condition (totem -> altar -> boss).
//
// Framework-free (no Phaser import), like Run/Buffs/Health — MainScene owns an
// instance, calls trigger(id) at the relevant hook points, and the HintUI
// subscribes via onShow. Per the user's call: the "already shown" set resets
// every run (a fresh instance in create()), while the on/off preference
// persists across runs in localStorage so a player who turns hints off stays
// off. Toggle lives in the pause menu (PauseMenuUI).
export type HintId =
  | "awaken"
  | "pickup_reach"
  | "tool_locked"
  | "open_menu"
  | "stamina_empty"
  | "took_damage"
  | "nightfall"
  | "elite_trophy"
  | "right_click_tip"
  | "altar_found"
  | "totem_ready"
  | "den_found"
  | "bled"
  | "magic_damage";

// Plain, terse tip text — no mascot voice, no cryptic flavor. Each nudges the
// mechanic just enough to unblock a cold player without solving anything.
const HINT_TEXT: Record<HintId, string> = {
  awaken: "Move with WASD. Press F11 for fullscreen. Explore and gather to grow stronger.",
  pickup_reach: "Left-click things within reach to interact.",
  tool_locked: "You'll need the right tool equipped for that.",
  open_menu: "Press Tab to open your pack and craft what you've learned.",
  stamina_empty: "Out of stamina. Sprinting, dashing, and attacking all drain it — let it recover.",
  took_damage: "Hurt? Cooked food and resting near a lit campfire both heal you over time.",
  nightfall: "Night falls. Enemies grow bolder in the dark — a torch lights the way.",
  elite_trophy: "That was an elite — it dropped a trophy. A Relic Forge can turn trophies into power.",
  right_click_tip: "Right-click equipped gear or a placed station to inspect and upgrade it.",
  altar_found: "You found the Gremlin War Camp — a heavily-defended stronghold. Worth exploring further once you're strong enough.",
  totem_ready: "You hold a Gremlin Totem. Take it to the Boss Altar and place it in the fire to summon the boss.",
  den_found: "A Duskrunner Warren — clear both guard waves, then hit the exposed den itself to smash it open for loot.",
  bled: "You're bleeding — it ticks damage over time and ignores armor. Some badlands attacks open wounds like this on hit.",
  magic_damage: "That hit came through your armor. Magic and fire damage bypass flat armor entirely — mind the badlands casters.",
};

const STORAGE_KEY = "survivor-rpg:hints-enabled:v1";

function loadEnabled(): boolean {
  // Default ON; tolerate a missing/blocked/corrupt store (same posture as
  // HighScores). Only the string "0" means "off".
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export class HintManager {
  private shown = new Set<HintId>(); // per-run; a fresh instance clears it
  private enabled: boolean;
  private listeners: ((text: string, id: HintId) => void)[] = [];

  constructor() {
    this.enabled = loadEnabled();
  }

  onShow(cb: (text: string, id: HintId) => void): void {
    this.listeners.push(cb);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // Non-fatal: preference just won't persist this session.
    }
  }

  // Show the hint once per run if enabled. Idempotent — safe to call from a
  // per-frame hover/update path; only the first call per id does anything.
  // When disabled it's a no-op AND doesn't mark the hint shown, so flipping
  // hints back on mid-run still surfaces future first-occurrences.
  trigger(id: HintId): void {
    if (!this.enabled || this.shown.has(id)) return;
    this.shown.add(id);
    for (const cb of this.listeners) cb(HINT_TEXT[id], id);
  }

  // Every tip discovered so far this run, in the order they first fired —
  // Sets preserve insertion order, so no separate list is needed. Backs the
  // Pause menu's re-readable Tips panel (playtest: right-click-to-upgrade
  // and other non-obvious gestures needed a way to look the tip back up).
  discovered(): string[] {
    return Array.from(this.shown).map((id) => HINT_TEXT[id]);
  }
}
