/**
 * UI-building material — tool/action metadata and a headless store.
 * Import from 'dohwa/ui'. Nothing here renders DOM; you build the toolbar.
 */
export { TOOL_METAS, ACTION_METAS, SHORTCUT_SECTIONS, ICON_ATTRS, getToolMeta, getToolsByGroup, getToolVariants, getActionMeta, toolIconSVG, } from './tools.js';
export type { ToolMeta, ActionMeta, ActionKey, ShortcutItem, ShortcutSection, } from './tools.js';
export { DohwaStore, createStore } from './store.js';
export type { DohwaUIState, Unsubscribe } from './store.js';
export { RECENT_COLORS_MAX, normalizeColor, isPaint, pushRecent } from './colors.js';
//# sourceMappingURL=ui.d.ts.map