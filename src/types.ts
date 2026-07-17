/** 도화 dohwa — core types */
import type { Matrix } from './geometry/matrix.js';

export interface Point {
  x: number;
  y: number;
}

/**
 * A freehand sample. Extends Point, so every geometry op that moves points
 * (translate/scale/flip) carries `pressure` through untouched.
 * Absent = no pressure data; the stroke draws at a uniform `strokeWidth`.
 */
export interface StrokePoint extends Point {
  /** stylus force, 0..1 (PointerEvent.pressure) */
  pressure?: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Style {
  /** stroke / text color. 'transparent' to disable */
  stroke: string;
  /** fill color. 'transparent' to disable */
  fill: string;
  strokeWidth: number;
  /** 0 ~ 1 */
  opacity: number;
}

interface NodeBase {
  id: string;
  style: Style;
  /**
   * Affine transform [a,b,c,d,e,f] applied around the node's bbox center,
   * on top of its base x/y/w/h geometry. Carries rotation, non-uniform
   * scale, and skew in one place. Absent = identity.
   *
   * When present, it takes precedence over the legacy `rotation` field.
   */
  transform?: Matrix;
  /**
   * @deprecated Legacy rotation in radians around the bbox center.
   * Still read for backward-compatible scene loading; new code uses `transform`.
   */
  rotation?: number;
  /** locked nodes are not selectable / erasable */
  locked?: boolean;
}

/** Freehand stroke */
export interface PathNode extends NodeBase {
  type: 'path';
  points: StrokePoint[];
}

export interface RectNode extends NodeBase {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  /** corner radius */
  rx?: number;
}

export interface EllipseNode extends NodeBase {
  type: 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiamondNode extends NodeBase {
  type: 'diamond';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TriangleNode extends NodeBase {
  type: 'triangle';
  x: number;
  y: number;
  w: number;
  h: number;
  /** apex points down when true */
  flipY?: boolean;
}

export interface LineNode extends NodeBase {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** draw an arrowhead at (x2, y2) */
  arrow?: boolean;
  /** draw an arrowhead at (x1, y1) too — a double-headed arrow */
  arrowStart?: boolean;
}

export interface TextNode extends NodeBase {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  /** measured box — maintained by the engine */
  w: number;
  h: number;
}

/**
 * Source-image crop window, as fractions of the ORIGINAL image (0..1).
 * `{ x: 0.25, y: 0, w: 0.5, h: 1 }` shows the horizontal middle half.
 * Stored normalized so it survives resizes and never needs the image's
 * natural pixel size (which the scene JSON does not carry).
 */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ImageNode extends NodeBase {
  type: 'image';
  x: number;
  y: number;
  w: number;
  h: number;
  /** dataURL or remote URL — kept in JSON for serialization */
  src: string;
  flipX?: boolean;
  flipY?: boolean;
  /** visible source window; absent = the whole image */
  crop?: CropRect;
  /**
   * Source regions punched out of this image — where pieces were torn off.
   * Same 0..1-of-the-source space as `crop`, so a hole sticks to the picture
   * content (it flips and scales with it). Rendered as an even-odd clip, so
   * nothing is erased: the source pixels stay intact and the hole is undoable
   * and resolution-independent, and survives `exportSVG` as a real clipPath.
   */
  holes?: CropRect[];
}

export interface GroupNode extends NodeBase {
  type: 'group';
  children: DohwaNode[];
}

export type DohwaNode =
  | PathNode
  | RectNode
  | EllipseNode
  | DiamondNode
  | TriangleNode
  | LineNode
  | TextNode
  | ImageNode
  | GroupNode;

export type Tool =
  | 'select'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'diamond'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'arrow-both'
  | 'text'
  | 'eraser'
  | 'pan';

export interface SceneJSON {
  app: 'dohwa';
  version: 1;
  nodes: DohwaNode[];
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface DohwaOptions {
  /** initial tool (default 'pen') */
  tool?: Tool;
  /** initial style for new nodes */
  style?: Partial<Style>;
  /** canvas background — drawn behind everything (default transparent) */
  background?: string;
  /** default font for text nodes (default 'sans-serif') */
  fontFamily?: string;
  /** default font size for new text nodes (default 28) */
  fontSize?: number;
  /** min/max zoom (default 0.1 / 8) */
  minZoom?: number;
  maxZoom?: number;
  /** snap moves to other objects' edges/centers with smart guides (default true; hold Alt to bypass) */
  snap?: boolean;
  /** vary freehand stroke width with stylus pressure (default true; pen input only) */
  pressure?: boolean;
}

export interface ExportPNGOptions {
  /** pixel density multiplier (default 2) */
  scale?: number;
  /** padding around content in world units (default 24) */
  padding?: number;
  /** background color (default transparent) */
  background?: string;
}

export interface ExportSVGOptions {
  /** padding around content in world units (default 24) */
  padding?: number;
  /** background color (default none) */
  background?: string;
}

export interface ReplayOptions {
  /** snapshots per second (default 5) */
  fps?: number;
}

export type DohwaEvent =
  | 'change'
  | 'selection'
  | 'tool'
  | 'style'
  | 'history'
  | 'viewport'
  | 'textedit'
  | 'crop'
  | 'replay';

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export const DEFAULT_STYLE: Style = {
  stroke: '#1c1917',
  fill: 'transparent',
  strokeWidth: 3,
  opacity: 1,
};
