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
  | "low_hp"
  | "nightfall"
  | "elite_trophy";

// Plain, terse tip text — no mascot voice, no cryptic flavor. Each nudges the
// mechanic just enough to unblock a cold player without solving anything.
const HINT_TEXT: Record<HintId, string> = {
  awaken: "Move with WASD. Explore and gather to grow stronger.",
  pickup_reach: "Left-click things within reach to interact.",
  tool_locked: "You'll need the right tool equipped for that.",
  open_menu: "Press Tab to open your pack and craft what you've learned.",
  stamina_empty: "Out of stamina — ease off sprinting to catch your breath.",
  low_hp: "Low health. Cooked food heals you over time — right-click to eat.",
  nightfall: "Night falls. Enemies grow bolder in the dark — a torch lights the way.",
  elite_trophy: "That was an elite — it dropped a trophy. A Relic Forge can turn trophies into power.",
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
}
