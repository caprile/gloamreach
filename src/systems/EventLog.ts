// A persistent, append-only log of notable events (recipe unlocks, level-ups,
// etc.). Kept as plain data so the UI can render/scroll it and a future
// save/load can persist it. Listeners fire on each new entry so the UI can
// pop a toast + refresh.
export type LogKind = "recipe" | "material" | "levelup" | "info" | "combat";

export interface LogEntry {
  id: number;
  kind: LogKind;
  message: string;
  icon?: string; // texture key, shown on the recipe-unlock toast
}

export class EventLog {
  private entries: LogEntry[] = [];
  private seq = 0;
  private listeners: ((entry: LogEntry) => void)[] = [];

  add(kind: LogKind, message: string, icon?: string): LogEntry {
    const entry: LogEntry = { id: this.seq++, kind, message, icon };
    this.entries.push(entry);
    for (const cb of this.listeners) cb(entry);
    return entry;
  }

  all(): ReadonlyArray<LogEntry> {
    return this.entries;
  }

  onAdd(cb: (entry: LogEntry) => void): void {
    this.listeners.push(cb);
  }
}
