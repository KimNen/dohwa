// ---------------------------------------------------------------- emitter
export class Emitter {
    constructor() {
        this.listeners = new Map();
    }
    on(event, fn) {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(fn);
        return () => this.off(event, fn);
    }
    off(event, fn) {
        this.listeners.get(event)?.delete(fn);
    }
    emit(event, payload) {
        this.listeners.get(event)?.forEach((fn) => fn(payload));
    }
    clear() {
        this.listeners.clear();
    }
}
// ---------------------------------------------------------------- history
/**
 * Snapshot-based undo/redo. Snapshots are JSON strings of the scene.
 * Simple and bulletproof for v0.1 — can move to command pattern later.
 */
export class History {
    constructor(initial, limit = 100) {
        this.stack = [];
        this.index = -1;
        this.limit = limit;
        this.stack.push(initial);
        this.index = 0;
    }
    /** Record a new state. Drops any redo branch. */
    push(snapshot) {
        if (snapshot === this.stack[this.index])
            return; // no-op change
        this.stack = this.stack.slice(0, this.index + 1);
        this.stack.push(snapshot);
        if (this.stack.length > this.limit)
            this.stack.shift();
        this.index = this.stack.length - 1;
    }
    undo() {
        if (!this.canUndo)
            return null;
        this.index -= 1;
        return this.stack[this.index];
    }
    redo() {
        if (!this.canRedo)
            return null;
        this.index += 1;
        return this.stack[this.index];
    }
    get canUndo() {
        return this.index > 0;
    }
    get canRedo() {
        return this.index < this.stack.length - 1;
    }
    reset(initial) {
        this.stack = [initial];
        this.index = 0;
    }
}
//# sourceMappingURL=core.js.map