/**
 * UI-building material — tool/action metadata and a headless store.
 * Import from 'dohwa/ui'. Nothing here renders DOM; you build the toolbar.
 */
export {
  TOOL_METAS,
  ACTION_METAS,
  ICON_ATTRS,
  getToolMeta,
  getToolsByGroup,
  getActionMeta,
  toolIconSVG,
} from './tools.js';
export type { ToolMeta, ActionMeta, ActionKey } from './tools.js';

export { DohwaStore, createStore } from './store.js';
export type { DohwaUIState, Unsubscribe } from './store.js';
