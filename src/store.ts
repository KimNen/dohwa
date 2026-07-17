import type { Dohwa } from './core/dohwa.js';
import type { Style, Tool, Viewport } from './types.js';
import { ACTION_METAS, type ActionKey } from './tools.js';
import { pushRecent, RECENT_COLORS_MAX } from './colors.js';

/**
 * A framework-agnostic snapshot of everything a toolbar needs.
 * The engine emits granular events; this collapses them into one
 * immutable object with a subscribe/getSnapshot pair — exactly the
 * shape React's useSyncExternalStore wants, and trivially adaptable
 * to Zustand, Vue reactive, Svelte stores, or a plain callback.
 */
export interface DohwaUIState {
  tool: Tool;
  style: Style;
  selectedIds: string[];
  selectionCount: number;
  canUndo: boolean;
  canRedo: boolean;
  viewport: Viewport;
  zoomPercent: number;
  editingTextId: string | null;
  isReplaying: boolean;
  hasLockedNodes: boolean;
  /** true if a replay is possible (2+ timeline frames) */
  canReplay: boolean;
  /** true while the interactive image-crop editor is open */
  isCropping: boolean;
  /** true when exactly one unlocked image is selected */
  canCrop: boolean;
  /** recently used stroke colors, most recent first (max RECENT_COLORS_MAX) */
  recentStrokes: string[];
  /** recently used fill colors, most recent first ('transparent' is never recorded) */
  recentFills: string[];
}

export type Unsubscribe = () => void;

export class DohwaStore {
  private app: Dohwa;
  private listeners = new Set<() => void>();
  private state: DohwaUIState;
  private offs: Unsubscribe[] = [];
  private recentStrokes: string[] = [];
  private recentFills: string[] = [];
  private lastStroke: string | null = null;
  private lastFill: string | null = null;

  constructor(app: Dohwa) {
    this.app = app;
    this.trackColors(); // seed recents from the starting style
    this.state = this.read();

    const refresh = (): void => {
      this.trackColors();
      const next = this.read();
      // shallow-compare so identical snapshots don't re-render
      if (!shallowEqual(next, this.state)) {
        this.state = next;
        this.listeners.forEach((fn) => fn());
      }
    };

    for (const event of [
      'tool',
      'style',
      'selection',
      'history',
      'viewport',
      'change',
      'textedit',
      'crop',
      'replay',
    ] as const) {
      this.offs.push(app.on(event, refresh));
    }
  }

  /** For React: useSyncExternalStore(store.subscribe, store.getSnapshot) */
  subscribe = (fn: () => void): Unsubscribe => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): DohwaUIState => this.state;

  /** Whether an action is currently available (for disabling buttons). */
  canRun = (key: ActionKey): boolean => {
    const meta = ACTION_METAS.find((a) => a.key === key);
    if (!meta) return false;
    const s = this.state;
    if (s.isReplaying) return false;
    if (key === 'crop') return s.canCrop;
    if (key === 'extractCrop') return s.isCropping;
    if (meta.minSelection) return s.selectionCount >= meta.minSelection;
    if (meta.needsMultiSelection) return s.selectionCount >= 2;
    if (meta.needsSelection) return s.selectionCount >= 1;
    if (key === 'undo') return s.canUndo;
    if (key === 'redo') return s.canRedo;
    if (key === 'replay') return s.canReplay;
    return true;
  };

  /** Run any toolbar action by key — one switch instead of 20 wired handlers. */
  run = (key: ActionKey): void => {
    const app = this.app;
    switch (key) {
      case 'undo': app.undo(); break;
      case 'redo': app.redo(); break;
      case 'group': app.group(); break;
      case 'ungroup': app.ungroup(); break;
      case 'bringToFront': app.bringToFront(); break;
      case 'sendToBack': app.sendToBack(); break;
      case 'bringForward': app.bringForward(); break;
      case 'sendBackward': app.sendBackward(); break;
      case 'alignLeft': app.alignSelection('left'); break;
      case 'alignHCenter': app.alignSelection('hcenter'); break;
      case 'alignRight': app.alignSelection('right'); break;
      case 'alignTop': app.alignSelection('top'); break;
      case 'alignVCenter': app.alignSelection('vcenter'); break;
      case 'alignBottom': app.alignSelection('bottom'); break;
      case 'distributeH': app.distributeSelection('horizontal'); break;
      case 'distributeV': app.distributeSelection('vertical'); break;
      case 'flipH': app.flipSelection('h'); break;
      case 'flipV': app.flipSelection('v'); break;
      case 'crop': app.startCrop(); break;
      case 'extractCrop': app.extractCrop(); break;
      case 'lock': app.lockSelection(); break;
      case 'duplicate': app.duplicateSelection(); break;
      case 'copy': app.copySelection(); break;
      case 'cut': app.cutSelection(); break;
      case 'paste': app.paste(); break;
      case 'delete': app.deleteSelection(); break;
      case 'selectAll': app.selectAll(); break;
      case 'replay': void app.replay(); break;
      case 'zoomIn': app.zoomIn(); break;
      case 'zoomOut': app.zoomOut(); break;
      case 'zoomToFit': app.zoomToFit(); break;
      case 'clear': app.clear(); break;
    }
  };

  destroy(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.listeners.clear();
  }

  /**
   * Record the current style's colors as "recently used" when they change.
   * Driven off the engine's own style, so colors picked from a palette, a
   * native picker, or `setStyle()` in code all land in the same list.
   */
  private trackColors(): void {
    const { stroke, fill } = this.app.getStyle();
    if (stroke !== this.lastStroke) {
      this.lastStroke = stroke;
      this.recentStrokes = pushRecent(this.recentStrokes, stroke, RECENT_COLORS_MAX);
    }
    if (fill !== this.lastFill) {
      this.lastFill = fill;
      this.recentFills = pushRecent(this.recentFills, fill, RECENT_COLORS_MAX);
    }
  }

  /**
   * Restore recent colors (e.g. from localStorage on load). Most recent first;
   * entries are deduped and capped, and 'transparent' is dropped.
   */
  setRecentColors(recent: { strokes?: string[]; fills?: string[] }): void {
    const rebuild = (list: string[] | undefined): string[] =>
      (list ?? []).reduceRight<string[]>((acc, c) => pushRecent(acc, c, RECENT_COLORS_MAX), []);
    if (recent.strokes) this.recentStrokes = rebuild(recent.strokes);
    if (recent.fills) this.recentFills = rebuild(recent.fills);
    this.state = this.read();
    this.listeners.forEach((fn) => fn());
  }

  private read(): DohwaUIState {
    const app = this.app;
    const ids = app.getSelectedIds();
    const vp = app.getViewport();
    const history = app.getHistoryState();
    return {
      tool: app.getTool(),
      style: app.getStyle(),
      selectedIds: ids,
      selectionCount: ids.length,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      viewport: vp,
      zoomPercent: Math.round(vp.scale * 100),
      editingTextId: app.getEditingTextId(),
      isReplaying: app.isReplaying(),
      hasLockedNodes: app.hasLockedNodes(),
      canReplay: app.getTimeline().length >= 2,
      isCropping: app.isCropping(),
      canCrop: app.canCrop(),
      recentStrokes: [...this.recentStrokes],
      recentFills: [...this.recentFills],
    };
  }
}

function shallowEqual(a: DohwaUIState, b: DohwaUIState): boolean {
  return (
    a.tool === b.tool &&
    a.selectionCount === b.selectionCount &&
    a.selectedIds.join(',') === b.selectedIds.join(',') &&
    a.canUndo === b.canUndo &&
    a.canRedo === b.canRedo &&
    a.zoomPercent === b.zoomPercent &&
    a.viewport.x === b.viewport.x &&
    a.viewport.y === b.viewport.y &&
    a.editingTextId === b.editingTextId &&
    a.isReplaying === b.isReplaying &&
    a.hasLockedNodes === b.hasLockedNodes &&
    a.canReplay === b.canReplay &&
    a.isCropping === b.isCropping &&
    a.canCrop === b.canCrop &&
    a.recentStrokes.join(',') === b.recentStrokes.join(',') &&
    a.recentFills.join(',') === b.recentFills.join(',') &&
    a.style.stroke === b.style.stroke &&
    a.style.fill === b.style.fill &&
    a.style.strokeWidth === b.style.strokeWidth &&
    a.style.opacity === b.style.opacity
  );
}

/** Convenience: create a store bound to an engine instance. */
export function createStore(app: Dohwa): DohwaStore {
  return new DohwaStore(app);
}
