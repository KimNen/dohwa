export const ICON_ATTRS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};
export const TOOL_METAS = [
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
const BY_TOOL = new Map(TOOL_METAS.map((m) => [m.tool, m]));
export function getToolMeta(tool) {
    return BY_TOOL.get(tool);
}
export function getToolsByGroup(group) {
    return TOOL_METAS.filter((m) => m.group === group);
}
/** Build a `<path d="...">` string set — handy for innerHTML-based UIs. */
export function toolIconSVG(tool, size = 20) {
    const meta = BY_TOOL.get(tool);
    if (!meta)
        return '';
    const paths = meta.icon.map((d) => `<path d="${d}"/>`).join('');
    return (`<svg width="${size}" height="${size}" viewBox="${ICON_ATTRS.viewBox}" fill="none" ` +
        `stroke="currentColor" stroke-width="${ICON_ATTRS.strokeWidth}" ` +
        `stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`);
}
export const ACTION_METAS = [
    { key: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', icon: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'] },
    { key: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', icon: ['M15 14l5-5-5-5', 'M20 9H10a6 6 0 0 0 0 12h3'] },
    { key: 'group', label: 'Group', shortcut: 'Ctrl+G', needsMultiSelection: true },
    { key: 'ungroup', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', needsSelection: true },
    { key: 'bringToFront', label: 'Bring to front', needsSelection: true },
    { key: 'sendToBack', label: 'Send to back', needsSelection: true },
    { key: 'flipH', label: 'Flip horizontal', needsSelection: true },
    { key: 'flipV', label: 'Flip vertical', needsSelection: true },
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
const BY_ACTION = new Map(ACTION_METAS.map((a) => [a.key, a]));
export function getActionMeta(key) {
    return BY_ACTION.get(key);
}
//# sourceMappingURL=tools.js.map