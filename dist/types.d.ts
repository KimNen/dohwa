/** 도화 dohwa — core types */
import type { Matrix } from './matrix.js';
export interface Point {
    x: number;
    y: number;
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
    points: Point[];
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
}
export interface GroupNode extends NodeBase {
    type: 'group';
    children: DohwaNode[];
}
export type DohwaNode = PathNode | RectNode | EllipseNode | DiamondNode | TriangleNode | LineNode | TextNode | ImageNode | GroupNode;
export type Tool = 'select' | 'pen' | 'rect' | 'ellipse' | 'diamond' | 'triangle' | 'line' | 'arrow' | 'text' | 'eraser' | 'pan';
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
export type DohwaEvent = 'change' | 'selection' | 'tool' | 'history' | 'viewport' | 'textedit' | 'replay';
export interface HistoryState {
    canUndo: boolean;
    canRedo: boolean;
}
export declare const DEFAULT_STYLE: Style;
export {};
//# sourceMappingURL=types.d.ts.map