import type { BBox, CropRect, DohwaNode, Point } from '../types.js';
import type { Matrix } from './matrix.js';
import {
  IDENTITY,
  applyToPoint,
  compose,
  invert,
  isIdentity,
  multiply,
  transformBBox as transformBox,
  translation,
} from './matrix.js';

// ---------------------------------------------------------------- node transform

/**
 * The node's effective affine transform, expressed around the WORLD origin
 * but pivoting on the node's own (untransformed) bbox center — so a pure
 * rotation/scale spins the node in place.
 *
 * Precedence: explicit `transform` first, else legacy `rotation`, else identity.
 * This is the single bridge between the old rotation-field scenes and the
 * new matrix model; every geometry op routes through it.
 */
export function nodeMatrix(node: DohwaNode): Matrix {
  const local = node.transform ?? (node.rotation ? compose({ angle: node.rotation }) : null);
  if (!local || isIdentity(local)) return IDENTITY;
  const c = bboxCenter(rawBBox(node));
  // translate(c) · local · translate(-c)
  return multiply(multiply(translation(c.x, c.y), local), translation(-c.x, -c.y));
}

/** True when the node has any non-identity transform. */
export function hasTransform(node: DohwaNode): boolean {
  if (node.transform) return !isIdentity(node.transform);
  return !!node.rotation;
}

/** Map a world point into the node's local (untransformed) space. */
export function toLocalPoint(node: DohwaNode, p: Point): Point {
  if (!hasTransform(node)) return p;
  return applyToPoint(invert(nodeMatrix(node)), p);
}

// ---------------------------------------------------------------- basics

export function rotatePoint(p: Point, c: Point, angle: number): Point {
  if (angle === 0) return { x: p.x, y: p.y };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

export function bboxCenter(b: BBox): Point {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function bboxCorners(b: BBox): [Point, Point, Point, Point] {
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ];
}

function aabbOfPoints(pts: Point[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---------------------------------------------------------------- bbox

/**
 * The node's own local bounding box, IGNORING its transform.
 * For groups, this is the union of children's transformed AABBs (in the
 * group's local space), so a group box tightly wraps its contents.
 */
export function rawBBox(node: DohwaNode): BBox {
  switch (node.type) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle':
    case 'image':
    case 'text':
      return { x: node.x, y: node.y, w: node.w, h: node.h };
    case 'line': {
      const x = Math.min(node.x1, node.x2);
      const y = Math.min(node.y1, node.y2);
      return { x, y, w: Math.abs(node.x2 - node.x1), h: Math.abs(node.y2 - node.y1) };
    }
    case 'path':
      return node.points.length === 0
        ? { x: 0, y: 0, w: 0, h: 0 }
        : aabbOfPoints(node.points);
    case 'group':
      return unionBBox(node.children.map(getAABB));
  }
}

/**
 * Local bounding box. Kept as an alias of rawBBox for backward compatibility
 * (callers that predate the transform model). Prefer rawBBox for the untransformed
 * box and getAABB for the world-space, transform-aware box.
 */
export function getBBox(node: DohwaNode): BBox {
  return rawBBox(node);
}

/** World-space axis-aligned bounding box, including the node's full transform. */
export function getAABB(node: DohwaNode): BBox {
  const box = rawBBox(node);
  if (!hasTransform(node)) return box;
  return transformBox(nodeMatrix(node), box);
}

export function unionBBox(boxes: BBox[]): BBox {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInBBox(p: Point, b: BBox, pad = 0): boolean {
  return (
    p.x >= b.x - pad && p.x <= b.x + b.w + pad &&
    p.y >= b.y - pad && p.y <= b.y + b.h + pad
  );
}

// ---------------------------------------------------------------- polygons

export function diamondPoints(b: BBox): Point[] {
  return [
    { x: b.x + b.w / 2, y: b.y },
    { x: b.x + b.w, y: b.y + b.h / 2 },
    { x: b.x + b.w / 2, y: b.y + b.h },
    { x: b.x, y: b.y + b.h / 2 },
  ];
}

export function trianglePoints(b: BBox, flipY = false): Point[] {
  return flipY
    ? [
        { x: b.x, y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x + b.w / 2, y: b.y + b.h },
      ]
    : [
        { x: b.x + b.w / 2, y: b.y },
        { x: b.x + b.w, y: b.y + b.h },
        { x: b.x, y: b.y + b.h },
      ];
}

function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function nearPolygonEdge(p: Point, poly: Point[], tol: number): boolean {
  for (let i = 0; i < poly.length; i++) {
    if (distToSegment(p, poly[i], poly[(i + 1) % poly.length]) <= tol) return true;
  }
  return false;
}

// ---------------------------------------------------------------- transforms

/** Translate a node (and its children) in place. */
export function translateNode(node: DohwaNode, dx: number, dy: number): void {
  switch (node.type) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle':
    case 'image':
    case 'text':
      node.x += dx;
      node.y += dy;
      break;
    case 'line':
      node.x1 += dx; node.y1 += dy;
      node.x2 += dx; node.y2 += dy;
      break;
    case 'path':
      for (const p of node.points) {
        p.x += dx;
        p.y += dy;
      }
      break;
    case 'group':
      for (const child of node.children) translateNode(child, dx, dy);
      break;
  }
}

/**
 * Rescale `node` so that geometry expressed relative to `from` maps into `to`.
 * `node` should hold the ORIGINAL (pre-resize) geometry; it is mutated in place.
 * Text scales its fontSize; the engine re-measures w/h afterwards.
 */
export function scaleNodeInto(node: DohwaNode, from: BBox, to: BBox): void {
  const sx = from.w === 0 ? 1 : to.w / from.w;
  const sy = from.h === 0 ? 1 : to.h / from.h;
  const mapX = (x: number) => to.x + (x - from.x) * sx;
  const mapY = (y: number) => to.y + (y - from.y) * sy;

  switch (node.type) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'triangle':
    case 'image': {
      const nx = mapX(node.x);
      const ny = mapY(node.y);
      node.w = node.w * sx;
      node.h = node.h * sy;
      node.x = nx;
      node.y = ny;
      if (node.type === 'rect' && node.rx) node.rx *= Math.min(sx, sy);
      break;
    }
    case 'text': {
      const nx = mapX(node.x);
      const ny = mapY(node.y);
      node.x = nx;
      node.y = ny;
      node.fontSize = Math.max(4, node.fontSize * sy);
      node.w *= sx;
      node.h *= sy;
      break;
    }
    case 'line':
      node.x1 = mapX(node.x1); node.y1 = mapY(node.y1);
      node.x2 = mapX(node.x2); node.y2 = mapY(node.y2);
      break;
    case 'path':
      for (const p of node.points) {
        p.x = mapX(p.x);
        p.y = mapY(p.y);
      }
      break;
    case 'group':
      for (const child of node.children) scaleNodeInto(child, from, to);
      break;
  }
}

/** Mirror a node across a vertical (axis='h') or horizontal (axis='v') line. */
export function flipNode(node: DohwaNode, axis: 'h' | 'v', center: Point): void {
  const fx = (x: number) => 2 * center.x - x;
  const fy = (y: number) => 2 * center.y - y;
  if (node.rotation) node.rotation = -node.rotation;

  switch (node.type) {
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'text':
      if (axis === 'h') node.x = fx(node.x + node.w);
      else node.y = fy(node.y + node.h);
      break;
    case 'triangle':
      if (axis === 'h') node.x = fx(node.x + node.w);
      else {
        node.y = fy(node.y + node.h);
        node.flipY = !node.flipY;
      }
      break;
    case 'image':
      if (axis === 'h') {
        node.x = fx(node.x + node.w);
        node.flipX = !node.flipX;
      } else {
        node.y = fy(node.y + node.h);
        node.flipY = !node.flipY;
      }
      break;
    case 'line':
      if (axis === 'h') { node.x1 = fx(node.x1); node.x2 = fx(node.x2); }
      else { node.y1 = fy(node.y1); node.y2 = fy(node.y2); }
      break;
    case 'path':
      for (const p of node.points) {
        if (axis === 'h') p.x = fx(p.x);
        else p.y = fy(p.y);
      }
      break;
    case 'group':
      for (const child of node.children) flipNode(child, axis, center);
      break;
  }
}

// ---------------------------------------------------------------- image crop

/**
 * The rect the FULL (uncropped) image would occupy, given the node's visible
 * rect `box` and its crop window. This is where the crop editor draws the
 * ghost image. Flip flags matter because flipping mirrors the rendered
 * content around the node rect's center, so the on-screen position of the
 * uncropped remainder mirrors too.
 */
export function cropFullRect(box: BBox, crop: CropRect | undefined, flipX = false, flipY = false): BBox {
  if (!crop) return { ...box };
  const w = box.w / crop.w;
  const h = box.h / crop.h;
  const relX = flipX ? 1 - crop.x - crop.w : crop.x;
  const relY = flipY ? 1 - crop.y - crop.h : crop.y;
  return { x: box.x - relX * w, y: box.y - relY * h, w, h };
}

/**
 * Inverse of cropFullRect: the crop window (source fractions) that shows
 * exactly `box` out of an image visually occupying `full`.
 */
export function cropFromRects(box: BBox, full: BBox, flipX = false, flipY = false): CropRect {
  const relX = (box.x - full.x) / full.w;
  const relY = (box.y - full.y) / full.h;
  const w = box.w / full.w;
  const h = box.h / full.h;
  return {
    x: flipX ? 1 - relX - w : relX,
    y: flipY ? 1 - relY - h : relY,
    w,
    h,
  };
}

// ---------------------------------------------------------------- hit testing

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

/**
 * @param tolerance hit slop in world units (scale-aware value should be passed by caller)
 */
export function hitTestNode(node: DohwaNode, point: Point, tolerance: number): boolean {
  const p = toLocalPoint(node, point);
  const tol = tolerance + node.style.strokeWidth / 2;

  switch (node.type) {
    case 'rect':
    case 'image':
    case 'text': {
      const filled =
        node.type !== 'rect' || node.style.fill !== 'transparent';
      const box = getBBox(node);
      if (filled) return pointInBBox(p, box, tol);
      return nearPolygonEdge(p, bboxCorners(box), tol);
    }
    case 'ellipse': {
      const cx = node.x + node.w / 2;
      const cy = node.y + node.h / 2;
      const rx = Math.max(node.w / 2, 0.001);
      const ry = Math.max(node.h / 2, 0.001);
      if (node.style.fill !== 'transparent') {
        const rxOut = rx + tol, ryOut = ry + tol;
        return ((p.x - cx) / rxOut) ** 2 + ((p.y - cy) / ryOut) ** 2 <= 1;
      }
      const outer = ((p.x - cx) / (rx + tol)) ** 2 + ((p.y - cy) / (ry + tol)) ** 2;
      const rIn = Math.max(rx - tol, 0.001), ryIn = Math.max(ry - tol, 0.001);
      const inner = ((p.x - cx) / rIn) ** 2 + ((p.y - cy) / ryIn) ** 2;
      return outer <= 1 && inner >= 1;
    }
    case 'diamond': {
      const poly = diamondPoints(getBBox(node));
      if (node.style.fill !== 'transparent') {
        return pointInPolygon(p, poly) || nearPolygonEdge(p, poly, tol);
      }
      return nearPolygonEdge(p, poly, tol);
    }
    case 'triangle': {
      const poly = trianglePoints(getBBox(node), node.flipY);
      if (node.style.fill !== 'transparent') {
        return pointInPolygon(p, poly) || nearPolygonEdge(p, poly, tol);
      }
      return nearPolygonEdge(p, poly, tol);
    }
    case 'line':
      return distToSegment(p, { x: node.x1, y: node.y1 }, { x: node.x2, y: node.y2 }) <= tol;
    case 'path': {
      if (!pointInBBox(p, getBBox(node), tol)) return false;
      const pts = node.points;
      if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= tol;
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(p, pts[i], pts[i + 1]) <= tol) return true;
      }
      return false;
    }
    case 'group':
      if (!pointInBBox(p, getBBox(node), tol)) return false;
      return node.children.some((c) => hitTestNode(c, p, tolerance));
  }
}
