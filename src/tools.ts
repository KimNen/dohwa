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

export const ICON_ATTRS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const TOOL_METAS: readonly ToolMeta[] = [
  {
    tool: 'select',
    key: 'select',
    label: 'Select',
    shortcut: 'v',
    group: 'draw',
    creates: false,
    icon: ['M5 3l14 8-6.5 1.5L9 19z'],
  },
  {
    tool: 'pen',
    key: 'pen',
    label: 'Pen',
    shortcut: 'p',
    group: 'draw',
    creates: true,
    icon: ['M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'],
  },
  {
    tool: 'eraser',
    key: 'eraser',
    label: 'Eraser',
    shortcut: 'e',
    group: 'draw',
    creates: false,
    icon: [
      'M20 20H8.5l-5-5a2 2 0 0 1 0-2.8l8.6-8.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13 19.5',
      'M8 9l7 7',
    ],
  },
  {
    tool: 'text',
    key: 'text',
    label: 'Text',
    shortcut: 't',
    group: 'draw',
    creates: true,
    icon: ['M5 6V4h14v2M12 4v16m-3 0h6'],
  },
  {
    tool: 'rect',
    key: 'rect',
    label: 'Rectangle',
    shortcut: 'r',
    group: 'shape',
    creates: true,
    icon: ['M4 5h16v14H4z'],
  },
  {
    tool: 'ellipse',
    key: 'ellipse',
    label: 'Ellipse',
    shortcut: 'o',
    group: 'shape',
    creates: true,
    icon: ['M12 5a8.5 7 0 1 0 0 14 8.5 7 0 1 0 0-14z'],
  },
  {
    tool: 'diamond',
    key: 'diamond',
    label: 'Diamond',
    shortcut: 'd',
    group: 'shape',
    creates: true,
    icon: ['M12 3l8 9-8 9-8-9z'],
  },
  {
    tool: 'triangle',
    key: 'triangle',
    label: 'Triangle',
    group: 'shape',
    creates: true,
    icon: ['M12 4l9 16H3z'],
  },
  {
    tool: 'line',
    key: 'line',
    label: 'Line',
    shortcut: 'l',
    group: 'shape',
    creates: true,
    icon: ['M5 19L19 5'],
  },
  {
    tool: 'arrow',
    key: 'arrow',
    label: 'Arrow',
    shortcut: 'a',
    group: 'shape',
    creates: true,
    icon: ['M5 19L19 5M19 5h-8M19 5v8'],
  },
  {
    tool: 'arrow-both',
    key: 'arrowBoth',
    label: 'Double arrow',
    group: 'shape',
    creates: true,
    variantOf: 'arrow',
    icon: ['M5 19L19 5M19 5h-8M19 5v8M5 19h8M5 19v-8'],
  },
  {
    tool: 'pan',
    key: 'pan',
    label: 'Pan',
    shortcut: 'h',
    group: 'view',
    creates: false,
    icon: [
      'M18 11V6.5a1.5 1.5 0 0 0-3 0V11m0-1.5v-3a1.5 1.5 0 0 0-3 0V11m0-1V8a1.5 1.5 0 0 0-3 0v5.5L7.5 12A1.6 1.6 0 0 0 5 14l4 6a4 4 0 0 0 3.4 2H15a4 4 0 0 0 4-4v-7a1.5 1.5 0 0 0-1-1.5z',
    ],
  },
];

const BY_TOOL = new Map<Tool, ToolMeta>(TOOL_METAS.map((m) => [m.tool, m]));

export function getToolMeta(tool: Tool): ToolMeta | undefined {
  return BY_TOOL.get(tool);
}

export function getToolsByGroup(group: ToolMeta['group']): ToolMeta[] {
  return TOOL_METAS.filter((m) => m.group === group);
}

/** Variants nested under a tool's button (for flyout / sub-toolbar menus). */
export function getToolVariants(tool: Tool): ToolMeta[] {
  return TOOL_METAS.filter((m) => m.variantOf === tool);
}

/** Build a `<path d="...">` string set — handy for innerHTML-based UIs. */
export function toolIconSVG(tool: Tool, size = 20): string {
  const meta = BY_TOOL.get(tool);
  if (!meta) return '';
  const paths = meta.icon.map((d) => `<path d="${d}"/>`).join('');
  return (
    `<svg width="${size}" height="${size}" viewBox="${ICON_ATTRS.viewBox}" fill="none" ` +
    `stroke="currentColor" stroke-width="${ICON_ATTRS.strokeWidth}" ` +
    `stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  );
}

// ---------------------------------------------------------------- actions

export type ActionKey =
  | 'undo'
  | 'redo'
  | 'group'
  | 'ungroup'
  | 'bringToFront'
  | 'sendToBack'
  | 'bringForward'
  | 'sendBackward'
  | 'alignLeft'
  | 'alignHCenter'
  | 'alignRight'
  | 'alignTop'
  | 'alignVCenter'
  | 'alignBottom'
  | 'distributeH'
  | 'distributeV'
  | 'flipH'
  | 'flipV'
  | 'crop'
  | 'lock'
  | 'duplicate'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'delete'
  | 'selectAll'
  | 'replay'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomToFit'
  | 'clear';

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

export const ACTION_METAS: readonly ActionMeta[] = [
  { key: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', icon: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'] },
  { key: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', icon: ['M15 14l5-5-5-5', 'M20 9H10a6 6 0 0 0 0 12h3'] },
  { key: 'group', label: 'Group', shortcut: 'Ctrl+G', needsMultiSelection: true },
  { key: 'ungroup', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', needsSelection: true },
  { key: 'bringToFront', label: 'Bring to front', needsSelection: true },
  { key: 'sendToBack', label: 'Send to back', needsSelection: true },
  { key: 'bringForward', label: 'Bring forward', needsSelection: true },
  { key: 'sendBackward', label: 'Send backward', needsSelection: true },
  { key: 'alignLeft', label: 'Align left', needsMultiSelection: true, icon: ['M4 3v18', 'M8 7h9v4H8z', 'M8 15h6v4H8z'] },
  { key: 'alignHCenter', label: 'Align horizontal centers', needsMultiSelection: true, icon: ['M12 3v18', 'M8 7h8v4H8z', 'M9 15h6v4H9z'] },
  { key: 'alignRight', label: 'Align right', needsMultiSelection: true, icon: ['M20 3v18', 'M7 7h9v4H7z', 'M10 15h6v4h-6z'] },
  { key: 'alignTop', label: 'Align top', needsMultiSelection: true, icon: ['M3 4h18', 'M7 8v9h4V8z', 'M15 8v6h4V8z'] },
  { key: 'alignVCenter', label: 'Align vertical centers', needsMultiSelection: true, icon: ['M3 12h18', 'M7 8v8h4V8z', 'M15 9v6h4V9z'] },
  { key: 'alignBottom', label: 'Align bottom', needsMultiSelection: true, icon: ['M3 20h18', 'M7 7v9h4V7z', 'M15 10v6h4v-6z'] },
  { key: 'distributeH', label: 'Distribute horizontally', minSelection: 3, icon: ['M4 3v18', 'M20 3v18', 'M10 8h4v8h-4z'] },
  { key: 'distributeV', label: 'Distribute vertically', minSelection: 3, icon: ['M3 4h18', 'M3 20h18', 'M8 10h8v4H8z'] },
  { key: 'flipH', label: 'Flip horizontal', needsSelection: true },
  { key: 'flipV', label: 'Flip vertical', needsSelection: true },
  {
    key: 'crop',
    label: 'Crop image',
    needsSelection: true,
    icon: ['M6 2v14a2 2 0 0 0 2 2h14', 'M18 22V8a2 2 0 0 0-2-2H2'],
  },
  { key: 'lock', label: 'Lock', needsSelection: true, icon: ['M5 11h14v9H5z', 'M8 11V7a4 4 0 0 1 8 0v4'] },
  { key: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', needsSelection: true },
  { key: 'copy', label: 'Copy', shortcut: 'Ctrl+C', needsSelection: true },
  { key: 'cut', label: 'Cut', shortcut: 'Ctrl+X', needsSelection: true },
  { key: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
  {
    key: 'delete',
    label: 'Delete',
    shortcut: 'Del',
    needsSelection: true,
    icon: ['M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'],
  },
  { key: 'selectAll', label: 'Select all', shortcut: 'Ctrl+A' },
  { key: 'replay', label: 'Replay' },
  { key: 'zoomIn', label: 'Zoom in' },
  { key: 'zoomOut', label: 'Zoom out' },
  { key: 'zoomToFit', label: 'Zoom to fit' },
  { key: 'clear', label: 'Clear' },
];

const BY_ACTION = new Map<ActionKey, ActionMeta>(ACTION_METAS.map((a) => [a.key, a]));

export function getActionMeta(key: ActionKey): ActionMeta | undefined {
  return BY_ACTION.get(key);
}

// ---------------------------------------------------------------- shortcuts

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
export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = [
  {
    key: 'tools',
    label: 'Tools',
    items: [
      ...TOOL_METAS.filter((m) => m.shortcut).map((m) => ({
        key: m.key,
        label: m.label,
        keys: [m.shortcut!.toUpperCase()],
      })),
      { key: 'arrowBoth', label: 'Double arrow (press again on Arrow)', keys: ['A', 'A'] },
      { key: 'panTemp', label: 'Pan (hold)', keys: ['Space'] },
    ],
  },
  {
    key: 'edit',
    label: 'Edit',
    items: [
      { key: 'undo', label: 'Undo', keys: ['Ctrl', 'Z'] },
      { key: 'redo', label: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] },
      { key: 'copy', label: 'Copy', keys: ['Ctrl', 'C'] },
      { key: 'cut', label: 'Cut', keys: ['Ctrl', 'X'] },
      { key: 'paste', label: 'Paste', keys: ['Ctrl', 'V'] },
      { key: 'duplicate', label: 'Duplicate', keys: ['Ctrl', 'D'] },
      { key: 'delete', label: 'Delete', keys: ['Del'] },
      { key: 'selectAll', label: 'Select all', keys: ['Ctrl', 'A'] },
      { key: 'deselect', label: 'Deselect', keys: ['Esc'] },
      { key: 'group', label: 'Group', keys: ['Ctrl', 'G'] },
      { key: 'ungroup', label: 'Ungroup', keys: ['Ctrl', 'Shift', 'G'] },
      { key: 'nudge', label: 'Nudge 1px', keys: ['← ↑ → ↓'] },
      { key: 'nudge10', label: 'Nudge 10px', keys: ['Shift', '← ↑ → ↓'] },
    ],
  },
  {
    key: 'draw',
    label: 'While drawing / transforming',
    items: [
      { key: 'snapSquare', label: 'Square / circle (shapes)', keys: ['Shift', 'drag'] },
      { key: 'snapAngle', label: '45° snap (line / arrow)', keys: ['Shift', 'drag'] },
      { key: 'snapRatio', label: 'Keep aspect ratio (resize)', keys: ['Shift', 'drag'] },
      { key: 'snapRotate', label: '15° snap (rotate)', keys: ['Shift', 'drag'] },
    ],
  },
  {
    key: 'textImage',
    label: 'Text & image',
    items: [
      { key: 'textEdit', label: 'Edit text', keys: ['Double-click'] },
      { key: 'textDone', label: 'Finish editing', keys: ['Ctrl', 'Enter'] },
      { key: 'cropStart', label: 'Crop image', keys: ['Double-click'] },
      { key: 'cropApply', label: 'Apply crop', keys: ['Enter'] },
      { key: 'cropCancel', label: 'Cancel crop', keys: ['Esc'] },
    ],
  },
  {
    key: 'view',
    label: 'View',
    items: [
      { key: 'zoomWheel', label: 'Zoom (to cursor)', keys: ['Wheel'] },
      { key: 'zoomFine', label: 'Fine zoom / pinch', keys: ['Ctrl', 'Wheel'] },
      { key: 'panSpace', label: 'Pan', keys: ['Space', 'drag'] },
    ],
  },
];
