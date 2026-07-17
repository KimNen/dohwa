import { DEFAULT_STYLE } from './types.js';
/**
 * Pure node constructors — no DOM, no engine instance required.
 * Build scenes on a server, in a test, or from an LLM's JSON output,
 * then hand them to `app.loadJSON()`.
 */
let counter = 0;
export function createId(prefix = 'n') {
    counter += 1;
    return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}
function withStyle(style) {
    return { ...DEFAULT_STYLE, ...style };
}
export function rect(init) {
    const { x, y, w, h, rx, style, transform, rotation, locked } = init;
    return { id: createId(), type: 'rect', x, y, w, h, rx, style: withStyle(style), transform, rotation, locked };
}
export function ellipse(init) {
    const { x, y, w, h, style, transform, rotation, locked } = init;
    return { id: createId(), type: 'ellipse', x, y, w, h, style: withStyle(style), transform, rotation, locked };
}
export function diamond(init) {
    const { x, y, w, h, style, transform, rotation, locked } = init;
    return { id: createId(), type: 'diamond', x, y, w, h, style: withStyle(style), transform, rotation, locked };
}
export function triangle(init) {
    const { x, y, w, h, flipY, style, transform, rotation, locked } = init;
    return {
        id: createId(), type: 'triangle', x, y, w, h, flipY,
        style: withStyle(style), transform, rotation, locked,
    };
}
export function line(init) {
    const { x1, y1, x2, y2, arrow, arrowStart, style, transform, rotation, locked } = init;
    return {
        id: createId(), type: 'line', x1, y1, x2, y2, arrow, arrowStart,
        style: withStyle(style), transform, rotation, locked,
    };
}
export function arrow(init) {
    const { both, ...rest } = init;
    return line({ ...rest, arrow: true, arrowStart: both || undefined });
}
export function path(init) {
    const { points, style, transform, rotation, locked } = init;
    return {
        id: createId(), type: 'path',
        points: points.map((p) => (p.pressure === undefined ? { x: p.x, y: p.y } : { x: p.x, y: p.y, pressure: p.pressure })),
        style: withStyle(style), transform, rotation, locked,
    };
}
/**
 * Text w/h are measured by the engine on load; the estimates here keep
 * server-built scenes usable for bbox math before they hit a browser.
 */
export function text(init) {
    const fontSize = init.fontSize ?? 28;
    const fontFamily = init.fontFamily ?? 'sans-serif';
    const lines = init.text.split('\n');
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
    return {
        id: createId(),
        type: 'text',
        x: init.x,
        y: init.y,
        text: init.text,
        fontSize,
        fontFamily,
        w: longest * fontSize * 0.6, // estimate — re-measured in the browser
        h: lines.length * fontSize * 1.3,
        style: withStyle({ fill: 'transparent', ...init.style }),
        transform: init.transform,
        rotation: init.rotation,
        locked: init.locked,
    };
}
export function image(init) {
    const { x, y, w, h, src, flipX, flipY, crop, holes, style, transform, rotation, locked } = init;
    return {
        id: createId(), type: 'image', x, y, w, h, src, flipX, flipY, crop,
        holes: holes ? holes.map((r) => ({ ...r })) : undefined,
        style: withStyle({ stroke: 'transparent', ...style }),
        transform, rotation, locked,
    };
}
export function group(children, init) {
    return {
        id: createId(), type: 'group', children,
        style: withStyle(init?.style), transform: init?.transform, rotation: init?.rotation, locked: init?.locked,
    };
}
/** Wrap nodes into a valid scene object. */
export function scene(nodes) {
    return { app: 'dohwa', version: 1, nodes };
}
const NODE_TYPES = new Set([
    'path', 'rect', 'ellipse', 'diamond', 'triangle', 'line', 'text', 'image', 'group',
]);
function validateNode(node, at, errors) {
    if (typeof node !== 'object' || node === null) {
        errors.push(`${at}: not an object`);
        return;
    }
    const n = node;
    if (typeof n.id !== 'string' || n.id === '')
        errors.push(`${at}: missing id`);
    if (typeof n.type !== 'string' || !NODE_TYPES.has(n.type)) {
        errors.push(`${at}: unknown type "${String(n.type)}"`);
        return;
    }
    const style = n.style;
    if (!style || typeof style.stroke !== 'string' || typeof style.strokeWidth !== 'number') {
        errors.push(`${at}: invalid style`);
    }
    if (n.type === 'group') {
        if (!Array.isArray(n.children)) {
            errors.push(`${at}: group.children must be an array`);
        }
        else {
            n.children.forEach((c, i) => validateNode(c, `${at}.children[${i}]`, errors));
        }
    }
}
/** Validate an untrusted scene (e.g. LLM output, user upload) before loading it. */
export function validateScene(input) {
    const errors = [];
    if (typeof input !== 'object' || input === null) {
        return { valid: false, errors: ['scene: not an object'] };
    }
    const s = input;
    if (s.app !== 'dohwa')
        errors.push('scene.app must be "dohwa"');
    if (s.version !== 1)
        errors.push('scene.version must be 1');
    if (!Array.isArray(s.nodes)) {
        errors.push('scene.nodes must be an array');
    }
    else {
        s.nodes.forEach((n, i) => validateNode(n, `nodes[${i}]`, errors));
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=factory.js.map