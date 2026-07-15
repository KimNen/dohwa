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
/** Build a `<path d="...">` string set — handy for innerHTML-based UIs. */
export declare function toolIconSVG(tool: Tool, size?: number): string;
export type ActionKey = 'undo' | 'redo' | 'group' | 'ungroup' | 'bringToFront' | 'sendToBack' | 'flipH' | 'flipV' | 'lock' | 'duplicate' | 'copy' | 'cut' | 'paste' | 'delete' | 'selectAll' | 'replay' | 'zoomIn' | 'zoomOut' | 'zoomToFit' | 'clear';
export interface ActionMeta {
    key: ActionKey;
    label: string;
    /** human-readable shortcut, e.g. 'Ctrl+Z' */
    shortcut?: string;
    /** requires a non-empty selection to be enabled */
    needsSelection?: boolean;
    /** requires 2+ selected nodes */
    needsMultiSelection?: boolean;
    icon?: string[];
}
export declare const ACTION_METAS: readonly ActionMeta[];
export declare function getActionMeta(key: ActionKey): ActionMeta | undefined;
//# sourceMappingURL=tools.d.ts.map