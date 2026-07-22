// Contextual nudge system — a Valheim-hint-style prompt that fires the FIRST
// time the player hits a given situation each run, then never again that run.
//
// Two flavors (the user's call, so nudges don't over-explain):
//   - "tutorial" (shown as TIP): teaches a control or a mechanic the player
//     can't otherwise discover — direct and explicit is GOOD here (WASD,
//     stamina drain, right-click-to-upgrade, bleed/magic ignoring armor).
//   - "hint" (shown as HINT): an in-character, deliberately vague nudge toward
//     an objective or a place. Points the player at something to go DO without
//     walking them through it — never spells out wave counts, the exact ritual,
//     or the win condition. First-person "journal" voice.
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
  | "dash_tip"
  | "multi_food_tip"
  | "altar_found"
  | "totem_ready"
  | "den_found"
  | "crypt_found"
  | "crypt_dark"
  | "bled"
  | "poisoned"
  | "magic_damage";

export type HintKind = "tutorial" | "hint";

export interface HintEntry {
  kind: HintKind;
  text: string;
}

// tutorial = explicit teaching (fine to be direct); hint = vague in-character
// nudge toward an objective/place (must not spoil the solution).
const HINT_DEFS: Record<HintId, HintEntry> = {
  awaken: {
    kind: "tutorial",
    text: "Move with WASD. Press F11 for fullscreen. Explore and gather to grow stronger.",
  },
  pickup_reach: { kind: "tutorial", text: "Left-click things within reach to interact." },
  tool_locked: { kind: "tutorial", text: "You'll need the right tool equipped for that." },
  open_menu: {
    kind: "tutorial",
    text: "Press Tab to open your pack and craft what you've learned.",
  },
  stamina_empty: {
    kind: "tutorial",
    text: "Out of stamina. Sprinting, dashing, and attacking all drain it — let it recover.",
  },
  took_damage: {
    kind: "tutorial",
    text: "Hurt? Cooked food and resting near a lit campfire both heal you over time.",
  },
  nightfall: {
    kind: "tutorial",
    text: "Night falls. Enemies grow bolder in the dark — a torch lights the way.",
  },
  elite_trophy: {
    kind: "tutorial",
    text: "That was an elite — it dropped a trophy. A Relic Forge can turn trophies into power.",
  },
  right_click_tip: {
    kind: "tutorial",
    text: "Right-click equipped gear or a placed station to inspect and upgrade it.",
  },
  dash_tip: {
    kind: "tutorial",
    text: "That burst was a dash (Spacebar while moving) — it briefly dodges hits and has its own cooldown.",
  },
  multi_food_tip: {
    kind: "tutorial",
    text: "Different foods stack their healing — you can have more than one meal buff running at once.",
  },
  bled: {
    kind: "tutorial",
    text: "You're bleeding — it ticks damage over time and ignores armor. Some badlands attacks open wounds like this on hit.",
  },
  poisoned: {
    kind: "tutorial",
    text: "You're poisoned — it ticks through armor like magic, and your healing is halved until it wears off. Get clear of the fumes.",
  },
  magic_damage: {
    kind: "tutorial",
    text: "That hit came through your armor. Magic and fire damage bypass flat armor entirely — mind the badlands casters.",
  },
  // Objective/place nudges — vague, in-character, no walkthrough.
  altar_found: {
    kind: "hint",
    text: "A war camp — walls, watch-fires, the lot. Whatever they've dug in to guard must be worth taking. I'll need to gear up before I storm it.",
  },
  totem_ready: {
    kind: "hint",
    text: "This totem is heavy with old menace. It's meant for something — some kind of altar, I'd wager. I should keep an eye out for one.",
  },
  den_found: {
    kind: "hint",
    text: "I've found a Duskrunner warren. Something's denned up in there — if I can deal with whatever's guarding it, it might be worth cracking open.",
  },
  crypt_found: {
    kind: "hint",
    text: "A doorway, half-sunk in the muck, and the stone still humming. Whatever the swamp folk buried down there, they buried it deep — and behind something.",
  },
  crypt_dark: {
    kind: "tutorial",
    text: "Rooms light up as you step into them — the dark ahead is simply where you haven't been. A torch widens what you can see.",
  },
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
  private listeners: ((text: string, id: HintId, kind: HintKind) => void)[] = [];

  constructor() {
    this.enabled = loadEnabled();
  }

  onShow(cb: (text: string, id: HintId, kind: HintKind) => void): void {
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
    const def = HINT_DEFS[id];
    for (const cb of this.listeners) cb(def.text, id, def.kind);
  }
}
