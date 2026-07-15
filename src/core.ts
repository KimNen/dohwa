// ---------------------------------------------------------------- emitter

type Listener = (payload?: unknown) => void;

export class Emitter<E extends string> {
  private listeners = new Map<E, Set<Listener>>();

  on(event: E, fn: Listener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return () => this.off(event, fn);
  }

  off(event: E, fn: Listener): void {
    this.listeners.get(event)?.delete(fn);
  }

  emit(event: E, payload?: unknown): void {
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}

// ---------------------------------------------------------------- history

/**
 * Snapshot-based undo/redo. Snapshots are JSON strings of the scene.
 * Simple and bulletproof for v0.1 — can move to command pattern later.
 */
export class History {
  private stack: string[] = [];
  private index = -1;
  private readonly limit: number;

  constructor(initial: string, limit = 100) {
    this.limit = limit;
    this.stack.push(initial);
    this.index = 0;
  }

  /** Record a new state. Drops any redo branch. */
  push(snapshot: string): void {
    if (snapshot === this.stack[this.index]) return; // no-op change
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(snapshot);
    if (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
  }

  undo(): string | null {
    if (!this.canUndo) return null;
    this.index -= 1;
    return this.stack[this.index];
  }

  redo(): string | null {
    if (!this.canRedo) return null;
    this.index += 1;
    return this.stack[this.index];
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  reset(initial: string): void {
    this.stack = [initial];
    this.index = 0;
  }
}
