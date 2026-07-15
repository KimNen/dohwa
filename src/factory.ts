import type {
  DiamondNode,
  DohwaNode,
  EllipseNode,
  GroupNode,
  ImageNode,
  LineNode,
  PathNode,
  Point,
  RectNode,
  SceneJSON,
  Style,
  TextNode,
  TriangleNode,
} from './types.js';
import { DEFAULT_STYLE } from './types.js';
import type { Matrix } from './matrix.js';

/**
 * Pure node constructors — no DOM, no engine instance required.
 * Build scenes on a server, in a test, or from an LLM's JSON output,
 * then hand them to `app.loadJSON()`.
 */

let counter = 0;
export function createId(prefix = 'n'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}

function withStyle(style?: Partial<Style>): Style {
  return { ...DEFAULT_STYLE, ...style };
}

export interface BoxInit {
  x: number;
  y: number;
  w: number;
  h: number;
  style?: Partial<Style>;
  /** affine transform [a,b,c,d,e,f] around the node's bbox center */
  transform?: Matrix;
  /** @deprecated legacy rotation (radians); prefer transform */
  rotation?: number;
  locked?: boolean;
}

export function rect(init: BoxInit & { rx?: number }): RectNode {
  const { x, y, w, h, rx, style, transform, rotation, locked } = init;
  return { id: createId(), type: 'rect', x, y, w, h, rx, style: withStyle(style), transform, rotation, locked };
}

export function ellipse(init: BoxInit): EllipseNode {
  const { x, y, w, h, style, transform, rotation, locked } = init;
  return { id: createId(), type: 'ellipse', x, y, w, h, style: withStyle(style), transform, rotation, locked };
}

export function diamond(init: BoxInit): DiamondNode {
  const { x, y, w, h, style, transform, rotation, locked } = init;
  return { id: createId(), type: 'diamond', x, y, w, h, style: withStyle(style), transform, rotation, locked };
}

export function triangle(init: BoxInit & { flipY?: boolean }): TriangleNode {
  const { x, y, w, h, flipY, style, rotation, locked } = init;
  return {
    id: createId(), type: 'triangle', x, y, w, h, flipY,
    style: withStyle(style), rotation, locked,
  };
}

export function line(init: {
  x1: number; y1: number; x2: number; y2: number;
  arrow?: boolean; style?: Partial<Style>; rotation?: number; locked?: boolean;
}): LineNode {
  const { x1, y1, x2, y2, arrow, style, rotation, locked } = init;
  return {
    id: createId(), type: 'line', x1, y1, x2, y2, arrow,
    style: withStyle(style), rotation, locked,
  };
}

export function arrow(init: {
  x1: number; y1: number; x2: number; y2: number;
  style?: Partial<Style>; rotation?: number; locked?: boolean;
}): LineNode {
  return line({ ...init, arrow: true });
}

export function path(init: {
  points: Point[]; style?: Partial<Style>; rotation?: number; locked?: boolean;
}): PathNode {
  const { points, style, rotation, locked } = init;
  return {
    id: createId(), type: 'path', points: points.map((p) => ({ x: p.x, y: p.y })),
    style: withStyle(style), rotation, locked,
  };
}

/**
 * Text w/h are measured by the engine on load; the estimates here keep
 * server-built scenes usable for bbox math before they hit a browser.
 */
export function text(init: {
  x: number; y: number; text: string;
  fontSize?: number; fontFamily?: string;
  style?: Partial<Style>; rotation?: number; locked?: boolean;
}): TextNode {
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
    rotation: init.rotation,
    locked: init.locked,
  };
}

export function image(init: BoxInit & {
  src: string; flipX?: boolean; flipY?: boolean;
}): ImageNode {
  const { x, y, w, h, src, flipX, flipY, style, rotation, locked } = init;
  return {
    id: createId(), type: 'image', x, y, w, h, src, flipX, flipY,
    style: withStyle({ stroke: 'transparent', ...style }),
    rotation, locked,
  };
}

export function group(children: DohwaNode[], init?: {
  style?: Partial<Style>; rotation?: number; locked?: boolean;
}): GroupNode {
  return {
    id: createId(), type: 'group', children,
    style: withStyle(init?.style), rotation: init?.rotation, locked: init?.locked,
  };
}

/** Wrap nodes into a valid scene object. */
export function scene(nodes: DohwaNode[]): SceneJSON {
  return { app: 'dohwa', version: 1, nodes };
}

// ---------------------------------------------------------------- validation

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const NODE_TYPES = new Set([
  'path', 'rect', 'ellipse', 'diamond', 'triangle', 'line', 'text', 'image', 'group',
]);

function validateNode(node: unknown, at: string, errors: string[]): void {
  if (typeof node !== 'object' || node === null) {
    errors.push(`${at}: not an object`);
    return;
  }
  const n = node as Record<string, unknown>;
  if (typeof n.id !== 'string' || n.id === '') errors.push(`${at}: missing id`);
  if (typeof n.type !== 'string' || !NODE_TYPES.has(n.type)) {
    errors.push(`${at}: unknown type "${String(n.type)}"`);
    return;
  }
  const style = n.style as Record<string, unknown> | undefined;
  if (!style || typeof style.stroke !== 'string' || typeof style.strokeWidth !== 'number') {
    errors.push(`${at}: invalid style`);
  }
  if (n.type === 'group') {
    if (!Array.isArray(n.children)) {
      errors.push(`${at}: group.children must be an array`);
    } else {
      n.children.forEach((c, i) => validateNode(c, `${at}.children[${i}]`, errors));
    }
  }
}

/** Validate an untrusted scene (e.g. LLM output, user upload) before loading it. */
export function validateScene(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['scene: not an object'] };
  }
  const s = input as Record<string, unknown>;
  if (s.app !== 'dohwa') errors.push('scene.app must be "dohwa"');
  if (s.version !== 1) errors.push('scene.version must be 1');
  if (!Array.isArray(s.nodes)) {
    errors.push('scene.nodes must be an array');
  } else {
    s.nodes.forEach((n, i) => validateNode(n, `nodes[${i}]`, errors));
  }
  return { valid: errors.length === 0, errors };
}
