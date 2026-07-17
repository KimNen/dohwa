import type { Tool } from './types.js';
/**
 * UI-building material. The engine never renders a toolbar itself —
 * it exposes the data so you can build one in React / Vue / vanilla / anything.
 */
export interface ToolMeta {
    tool: Tool;
    /** stable, non-localized key — use it to look up your own i18n strings */
    key: string;
    /** English label (default). Override with your own dictionary. */
    label: string;
    /** single-key shortcut (lowercase), if any */
    shortcut?: string;
    /**
     * SVG path data for a 24x24 viewBox, stroke-based icon.
     * Render with: fill="none" stroke="currentColor" stroke-width="2"
     *              stroke-linecap="round" stroke-linejoin="round"
     */
    icon: string[];
    /** grouping hint for toolbars: draw / shape / view */
    group: 'draw' | 'shape' | 'view';
    /** true if the tool creates nodes (vs. select / pan / eraser) */
    creates: boolean;
    /**
     * When set, this tool is a variant of another tool and toolbars should
     * nest it under that tool's button (e.g. a right-click / long-press
     * sub-menu) instead of giving it its own top-level slot.
     * Pressing the parent's shortcut again cycles through its variants.
     */
    variantOf?: Tool;
}
export declare const ICON_ATTRS: {
    readonly viewBox: "0 0 24 24";
    readonly fill: "none";
    readonly stroke: "currentColor";
    readonly strokeWidth: 2;
    readonly strokeLinecap: "round";
    readonly strokeLinejoin: "round";
};
export declare const TOOL_METAS: readonly ToolMeta[];
export declare function getToolMeta(tool: Tool): ToolMeta | undefined;
export declare function getToolsByGroup(group: ToolMeta['group']): ToolMeta[];
/** Variants nested under a tool's button (for flyout / sub-toolbar menus). */
export declare function getToolVariants(tool: Tool): ToolMeta[];
/** Build a `<path d="...">` string set — handy for innerHTML-based UIs. */
export declare function toolIconSVG(tool: Tool, size?: number): string;
export type ActionKey = 'undo' | 'redo' | 'group' | 'ungroup' | 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward' | 'alignLeft' | 'alignHCenter' | 'alignRight' | 'alignTop' | 'alignVCenter' | 'alignBottom' | 'distributeH' | 'distributeV' | 'flipH' | 'flipV' | 'crop' | 'lock' | 'duplicate' | 'copy' | 'cut' | 'paste' | 'delete' | 'selectAll' | 'replay' | 'zoomIn' | 'zoomOut' | 'zoomToFit' | 'clear';
export interface ActionMeta {
    key: ActionKey;
    label: string;
    /** human-readable shortcut, e.g. 'Ctrl+Z' */
    shortcut?: string;
    /** requires a non-empty selection to be enabled */
    needsSelection?: boolean;
    /** requires 2+ selected nodes */
    needsMultiSelection?: boolean;
    /** requires at least N selected nodes (e.g. distribute needs 3) */
    minSelection?: number;
    icon?: string[];
}
export declare const ACTION_METAS: readonly ActionMeta[];
export declare function getActionMeta(key: ActionKey): ActionMeta | undefined;
/**
 * One entry of the keyboard-shortcut reference. `keys` are the chips a help
 * screen renders (['Ctrl', 'Shift', 'Z'] → Ctrl + Shift + Z); `key` is a
 * stable identifier for your own i18n dictionary, like ToolMeta.key.
 * 'Ctrl' means ⌘ on macOS — the engine accepts either.
 */
export interface ShortcutItem {
    key: string;
    label: string;
    keys: string[];
}
export interface ShortcutSection {
    key: string;
    label: string;
    items: ShortcutItem[];
}
/**
 * The full keyboard map, grouped for a help / cheat-sheet screen.
 * Tool rows are derived from TOOL_METAS so the two never drift apart.
 */
export declare const SHORTCUT_SECTIONS: readonly ShortcutSection[];
//# sourceMappingURL=tools.d.ts.map