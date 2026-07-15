import type { DohwaNode, PathNode } from '../types.js';
export type ImageCache = Map<string, HTMLImageElement>;
export declare const LINE_HEIGHT = 1.3;
export declare function measureText(text: string, fontSize: number, fontFamily: string): {
    w: number;
    h: number;
};
/** Smooth polyline: quadratic curves through segment midpoints. */
export declare function tracePath(ctx: CanvasRenderingContext2D, node: PathNode): void;
/** Arrowhead geometry for a line ending at (x2, y2). */
export declare function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number): [Point2, Point2];
interface Point2 {
    x: number;
    y: number;
}
export interface RenderOptions {
    /** node id currently being edited inline — skipped while editing */
    skipId?: string | null;
}
export declare function renderNode(ctx: CanvasRenderingContext2D, node: DohwaNode, images: ImageCache, options?: RenderOptions): void;
export declare function renderScene(ctx: CanvasRenderingContext2D, nodes: DohwaNode[], images: ImageCache, options?: RenderOptions): void;
export {};
//# sourceMappingURL=render.d.ts.map