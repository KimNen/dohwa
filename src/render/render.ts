import type { DohwaNode, PathNode, TextNode } from '../types.js';
import { diamondPoints, getBBox, nodeMatrix, trianglePoints } from '../geometry/geometry.js';
import { isIdentity } from '../geometry/matrix.js';

export type ImageCache = Map<string, HTMLImageElement>;

export const LINE_HEIGHT = 1.3;

// ---------------------------------------------------------------- text measure

let measureCtx: CanvasRenderingContext2D | null = null;

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
): { w: number; h: number } {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  const lines = text.split('\n');
  let w = fontSize * 0.5;
  if (measureCtx) {
    measureCtx.font = `${fontSize}px ${fontFamily}`;
    for (const line of lines) {
      w = Math.max(w, measureCtx.measureText(line).width);
    }
  }
  return { w, h: Math.max(lines.length, 1) * fontSize * LINE_HEIGHT };
}

// ---------------------------------------------------------------- helpers

function applyStrokeFill(
  ctx: CanvasRenderingContext2D,
  node: DohwaNode,
  draw: () => void,
): void {
  const { stroke, fill, strokeWidth } = node.style;
  ctx.beginPath();
  draw();
  if (fill !== 'transparent') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke !== 'transparent' && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Smooth polyline: quadratic curves through segment midpoints. */
export function tracePath(ctx: CanvasRenderingContext2D, node: PathNode): void {
  const pts = node.points;
  if (pts.length === 0) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) {
    ctx.lineTo(pts[0].x + 0.01, pts[0].y); // dot
    return;
  }
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Arrowhead geometry for a line ending at (x2, y2). */
export function arrowHead(
  x1: number, y1: number, x2: number, y2: number, size: number,
): [Point2, Point2] {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a = angle + Math.PI - Math.PI / 7;
  const b = angle + Math.PI + Math.PI / 7;
  return [
    { x: x2 + Math.cos(a) * size, y: y2 + Math.sin(a) * size },
    { x: x2 + Math.cos(b) * size, y: y2 + Math.sin(b) * size },
  ];
}
interface Point2 { x: number; y: number }

function renderText(ctx: CanvasRenderingContext2D, node: TextNode): void {
  ctx.font = `${node.fontSize}px ${node.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = node.style.stroke === 'transparent' ? '#000' : node.style.stroke;
  const lines = node.text.split('\n');
  const lh = node.fontSize * LINE_HEIGHT;
  const pad = (lh - node.fontSize) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, node.x, node.y + i * lh + pad);
  });
}

// ---------------------------------------------------------------- node render

export interface RenderOptions {
  /** node id currently being edited inline — skipped while editing */
  skipId?: string | null;
}

export function renderNode(
  ctx: CanvasRenderingContext2D,
  node: DohwaNode,
  images: ImageCache,
  options: RenderOptions = {},
): void {
  if (options.skipId && node.id === options.skipId) return;
  ctx.save();
  ctx.globalAlpha *= node.style.opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const m = nodeMatrix(node);
  if (!isIdentity(m)) {
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  }

  switch (node.type) {
    case 'path':
      applyStrokeFill(ctx, node, () => tracePath(ctx, node));
      break;
    case 'rect':
      applyStrokeFill(ctx, node, () => {
        if (node.rx && node.rx > 0) traceRoundedRect(ctx, node.x, node.y, node.w, node.h, node.rx);
        else ctx.rect(node.x, node.y, node.w, node.h);
      });
      break;
    case 'ellipse':
      applyStrokeFill(ctx, node, () =>
        ctx.ellipse(
          node.x + node.w / 2,
          node.y + node.h / 2,
          Math.max(node.w / 2, 0),
          Math.max(node.h / 2, 0),
          0,
          0,
          Math.PI * 2,
        ),
      );
      break;
    case 'diamond':
      applyStrokeFill(ctx, node, () => {
        const pts = diamondPoints(getBBox(node));
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      });
      break;
    case 'triangle':
      applyStrokeFill(ctx, node, () => {
        const pts = trianglePoints(getBBox(node), node.flipY);
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      });
      break;
    case 'line':
      applyStrokeFill(ctx, node, () => {
        ctx.moveTo(node.x1, node.y1);
        ctx.lineTo(node.x2, node.y2);
        if (node.arrow) {
          const size = Math.max(10, node.style.strokeWidth * 3.2);
          const [a, b] = arrowHead(node.x1, node.y1, node.x2, node.y2, size);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(node.x2, node.y2);
          ctx.lineTo(b.x, b.y);
        }
      });
      break;
    case 'text':
      renderText(ctx, node);
      break;
    case 'image': {
      const img = images.get(node.src);
      if (img && img.complete && img.naturalWidth > 0) {
        if (node.flipX || node.flipY) {
          const cx = node.x + node.w / 2;
          const cy = node.y + node.h / 2;
          ctx.translate(cx, cy);
          ctx.scale(node.flipX ? -1 : 1, node.flipY ? -1 : 1);
          ctx.translate(-cx, -cy);
        }
        ctx.drawImage(img, node.x, node.y, node.w, node.h);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(node.x, node.y, node.w, node.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(node.x, node.y, node.w, node.h);
        ctx.setLineDash([]);
      }
      break;
    }
    case 'group':
      for (const child of node.children) renderNode(ctx, child, images, options);
      break;
  }
  ctx.restore();
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  nodes: DohwaNode[],
  images: ImageCache,
  options: RenderOptions = {},
): void {
  for (const node of nodes) renderNode(ctx, node, images, options);
}
