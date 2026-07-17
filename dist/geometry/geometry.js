import { IDENTITY, applyToPoint, compose, invert, isIdentity, multiply, transformBBox as transformBox, translation, } from './matrix.js';
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
export function nodeMatrix(node) {
    const local = node.transform ?? (node.rotation ? compose({ angle: node.rotation }) : null);
    if (!local || isIdentity(local))
        return IDENTITY;
    const c = bboxCenter(rawBBox(node));
    // translate(c) · local · translate(-c)
    return multiply(multiply(translation(c.x, c.y), local), translation(-c.x, -c.y));
}
/** True when the node has any non-identity transform. */
export function hasTransform(node) {
    if (node.transform)
        return !isIdentity(node.transform);
    return !!node.rotation;
}
/** Map a world point into the node's local (untransformed) space. */
export function toLocalPoint(node, p) {
    if (!hasTransform(node))
        return p;
    return applyToPoint(invert(nodeMatrix(node)), p);
}
// ---------------------------------------------------------------- basics
export function rotatePoint(p, c, angle) {
    if (angle === 0)
        return { x: p.x, y: p.y };
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}
export function bboxCenter(b) {
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
export function bboxCorners(b) {
    return [
        { x: b.x, y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x + b.w, y: b.y + b.h },
        { x: b.x, y: b.y + b.h },
    ];
}
function aabbOfPoints(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
        if (p.x < minX)
            minX = p.x;
        if (p.y < minY)
            minY = p.y;
        if (p.x > maxX)
            maxX = p.x;
        if (p.y > maxY)
            maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
// ---------------------------------------------------------------- bbox
/**
 * The node's own local bounding box, IGNORING its transform.
 * For groups, this is the union of children's transformed AABBs (in the
 * group's local space), so a group box tightly wraps its contents.
 */
export function rawBBox(node) {
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
export function getBBox(node) {
    return rawBBox(node);
}
/** World-space axis-aligned bounding box, including the node's full transform. */
export function getAABB(node) {
    const box = rawBBox(node);
    if (!hasTransform(node))
        return box;
    return transformBox(nodeMatrix(node), box);
}
export function unionBBox(boxes) {
    if (boxes.length === 0)
        return { x: 0, y: 0, w: 0, h: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of boxes) {
        if (b.x < minX)
            minX = b.x;
        if (b.y < minY)
            minY = b.y;
        if (b.x + b.w > maxX)
            maxX = b.x + b.w;
        if (b.y + b.h > maxY)
            maxY = b.y + b.h;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
export function bboxIntersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function pointInBBox(p, b, pad = 0) {
    return (p.x >= b.x - pad && p.x <= b.x + b.w + pad &&
        p.y >= b.y - pad && p.y <= b.y + b.h + pad);
}
// ---------------------------------------------------------------- polygons
export function diamondPoints(b) {
    return [
        { x: b.x + b.w / 2, y: b.y },
        { x: b.x + b.w, y: b.y + b.h / 2 },
        { x: b.x + b.w / 2, y: b.y + b.h },
        { x: b.x, y: b.y + b.h / 2 },
    ];
}
export function trianglePoints(b, flipY = false) {
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
function pointInPolygon(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (a.y > p.y !== b.y > p.y &&
            p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
            inside = !inside;
        }
    }
    return inside;
}
function nearPolygonEdge(p, poly, tol) {
    for (let i = 0; i < poly.length; i++) {
        if (distToSegment(p, poly[i], poly[(i + 1) % poly.length]) <= tol)
            return true;
    }
    return false;
}
// ---------------------------------------------------------------- transforms
/** Translate a node (and its children) in place. */
export function translateNode(node, dx, dy) {
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
            node.x1 += dx;
            node.y1 += dy;
            node.x2 += dx;
            node.y2 += dy;
            break;
        case 'path':
            for (const p of node.points) {
                p.x += dx;
                p.y += dy;
            }
            break;
        case 'group':
            for (const child of node.children)
                translateNode(child, dx, dy);
            break;
    }
}
/**
 * Rescale `node` so that geometry expressed relative to `from` maps into `to`.
 * `node` should hold the ORIGINAL (pre-resize) geometry; it is mutated in place.
 * Text scales its fontSize; the engine re-measures w/h afterwards.
 */
export function scaleNodeInto(node, from, to) {
    const sx = from.w === 0 ? 1 : to.w / from.w;
    const sy = from.h === 0 ? 1 : to.h / from.h;
    const mapX = (x) => to.x + (x - from.x) * sx;
    const mapY = (y) => to.y + (y - from.y) * sy;
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
            if (node.type === 'rect' && node.rx)
                node.rx *= Math.min(sx, sy);
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
            node.x1 = mapX(node.x1);
            node.y1 = mapY(node.y1);
            node.x2 = mapX(node.x2);
            node.y2 = mapY(node.y2);
            break;
        case 'path':
            for (const p of node.points) {
                p.x = mapX(p.x);
                p.y = mapY(p.y);
            }
            break;
        case 'group':
            for (const child of node.children)
                scaleNodeInto(child, from, to);
            break;
    }
}
/** Mirror a node across a vertical (axis='h') or horizontal (axis='v') line. */
export function flipNode(node, axis, center) {
    const fx = (x) => 2 * center.x - x;
    const fy = (y) => 2 * center.y - y;
    // Mirror the node's orientation. The transform is applied around the bbox
    // center, so reflecting it means conjugating by the reflection R (R·M·R,
    // R being its own inverse): a horizontal flip sends R(θ)→R(−θ), and also
    // correctly mirrors non-uniform scale and skew. `transform` takes precedence
    // over the legacy `rotation` field, matching nodeMatrix().
    if (node.transform) {
        const r = axis === 'h' ? [-1, 0, 0, 1, 0, 0] : [1, 0, 0, -1, 0, 0];
        node.transform = multiply(multiply(r, node.transform), r);
    }
    else if (node.rotation) {
        node.rotation = -node.rotation;
    }
    switch (node.type) {
        case 'rect':
        case 'ellipse':
        case 'diamond':
        case 'text':
            if (axis === 'h')
                node.x = fx(node.x + node.w);
            else
                node.y = fy(node.y + node.h);
            break;
        case 'triangle':
            if (axis === 'h')
                node.x = fx(node.x + node.w);
            else {
                node.y = fy(node.y + node.h);
                node.flipY = !node.flipY;
            }
            break;
        case 'image':
            if (axis === 'h') {
                node.x = fx(node.x + node.w);
                node.flipX = !node.flipX;
            }
            else {
                node.y = fy(node.y + node.h);
                node.flipY = !node.flipY;
            }
            break;
        case 'line':
            if (axis === 'h') {
                node.x1 = fx(node.x1);
                node.x2 = fx(node.x2);
            }
            else {
                node.y1 = fy(node.y1);
                node.y2 = fy(node.y2);
            }
            break;
        case 'path':
            for (const p of node.points) {
                if (axis === 'h')
                    p.x = fx(p.x);
                else
                    p.y = fy(p.y);
            }
            break;
        case 'group':
            for (const child of node.children)
                flipNode(child, axis, center);
            break;
    }
}
/**
 * Per-box translation deltas that align every box to the selection's shared
 * edge/center. Pure: takes world AABBs, returns one {x,y} delta per box in the
 * same order. A single box (or empty) yields zero deltas.
 */
export function alignDeltas(boxes, mode) {
    if (boxes.length < 2)
        return boxes.map(() => ({ x: 0, y: 0 }));
    const u = unionBBox(boxes);
    return boxes.map((b) => {
        switch (mode) {
            case 'left': return { x: u.x - b.x, y: 0 };
            case 'right': return { x: u.x + u.w - (b.x + b.w), y: 0 };
            case 'hcenter': return { x: u.x + u.w / 2 - (b.x + b.w / 2), y: 0 };
            case 'top': return { x: 0, y: u.y - b.y };
            case 'bottom': return { x: 0, y: u.y + u.h - (b.y + b.h) };
            case 'vcenter': return { x: 0, y: u.y + u.h / 2 - (b.y + b.h / 2) };
        }
    });
}
/**
 * Per-box translation deltas that spread boxes so the GAPS between consecutive
 * boxes are equal (Figma's "distribute spacing"). The extreme boxes stay put;
 * only the in-between ones move. Fewer than 3 boxes yields zero deltas.
 */
export function distributeDeltas(boxes, axis) {
    const n = boxes.length;
    const deltas = boxes.map(() => ({ x: 0, y: 0 }));
    if (n < 3)
        return deltas;
    const horiz = axis === 'horizontal';
    const size = (b) => (horiz ? b.w : b.h);
    const start = (b) => (horiz ? b.x : b.y);
    const order = boxes.map((_, i) => i).sort((a, b) => start(boxes[a]) - start(boxes[b]));
    const first = boxes[order[0]];
    const last = boxes[order[n - 1]];
    const span = start(last) + size(last) - start(first);
    const sumSize = boxes.reduce((s, b) => s + size(b), 0);
    const gap = (span - sumSize) / (n - 1);
    let cursor = start(first);
    for (const i of order) {
        const d = cursor - start(boxes[i]);
        deltas[i] = horiz ? { x: d, y: 0 } : { x: 0, y: d };
        cursor += size(boxes[i]) + gap;
    }
    return deltas;
}
/**
 * The skew matrix produced by dragging a frame EDGE handle by `delta` (in the
 * frame's local, unrotated space). Dragging a horizontal edge (n/s) sideways
 * skews along X; a vertical edge (e/w) up/down skews along Y. The factor is
 * derived so the grabbed edge tracks the pointer: the edge sits h/2 (or w/2)
 * from the center, so shifting it by `delta` needs tan = 2·delta/size.
 * Returned in local frame space — pivot it around the box center to apply.
 */
export function skewFromEdgeDrag(box, edge, delta) {
    let tanX = 0;
    let tanY = 0;
    if (edge === 'n' && box.h > 0)
        tanX = (-2 * delta.x) / box.h;
    else if (edge === 's' && box.h > 0)
        tanX = (2 * delta.x) / box.h;
    else if (edge === 'w' && box.w > 0)
        tanY = (-2 * delta.y) / box.w;
    else if (edge === 'e' && box.w > 0)
        tanY = (2 * delta.y) / box.w;
    return [1, tanY, tanX, 1, 0, 0];
}
/**
 * Snap a moving box to nearby target boxes' edges and centers. Each axis snaps
 * independently to its single closest line within `threshold` (world units);
 * `guides` lists every target line that ends up coinciding, for drawing smart
 * guides. Pure — no state, no DOM.
 */
export function snapMove(moving, targets, threshold) {
    const ax = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
    const ay = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];
    const linesX = [];
    const linesY = [];
    for (const t of targets) {
        linesX.push(t.x, t.x + t.w / 2, t.x + t.w);
        linesY.push(t.y, t.y + t.h / 2, t.y + t.h);
    }
    const bestDiff = (anchors, lines) => {
        let diff = null;
        for (const a of anchors) {
            for (const l of lines) {
                const d = l - a;
                if (diff === null || Math.abs(d) < Math.abs(diff))
                    diff = d;
            }
        }
        return diff !== null && Math.abs(diff) <= threshold ? diff : null;
    };
    const dx = bestDiff(ax, linesX);
    const dy = bestDiff(ay, linesY);
    const rdx = dx ?? 0;
    const rdy = dy ?? 0;
    const guides = { x: [], y: [] };
    if (dx !== null) {
        const moved = ax.map((a) => a + rdx);
        for (const l of linesX)
            if (moved.some((a) => Math.abs(a - l) < 1e-6))
                guides.x.push(l);
    }
    if (dy !== null) {
        const moved = ay.map((a) => a + rdy);
        for (const l of linesY)
            if (moved.some((a) => Math.abs(a - l) < 1e-6))
                guides.y.push(l);
    }
    return { dx: rdx, dy: rdy, guides: { x: [...new Set(guides.x)], y: [...new Set(guides.y)] } };
}
/**
 * Move the selected entries of an ordered id list one step toward the front
 * (`forward`, i.e. later in the array) or back (`backward`). A contiguous run
 * of selected ids moves together and preserves its internal order. Pure: does
 * not mutate the input, returns a new array.
 */
export function orderStep(order, selected, dir) {
    const next = order.slice();
    const sel = (i) => selected.has(next[i]);
    if (dir === 'forward') {
        for (let i = next.length - 2; i >= 0; i--) {
            if (sel(i) && !sel(i + 1))
                [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
    }
    else {
        for (let i = 1; i < next.length; i++) {
            if (sel(i) && !sel(i - 1))
                [next[i], next[i - 1]] = [next[i - 1], next[i]];
        }
    }
    return next;
}
// ---------------------------------------------------------------- pressure
/** Width floor as a fraction of strokeWidth, so pressure 0 still leaves a mark. */
const PRESSURE_MIN = 0.35;
/** True when a stroke carries stylus pressure and must be drawn with varying width. */
export function hasPressure(node) {
    return node.points.some((p) => p.pressure !== undefined);
}
/**
 * Effective stroke width for one sample. Maps pressure 0..1 onto
 * PRESSURE_MIN..1 of `base`; a sample with no pressure draws at full width.
 * Lives here (not in render/) so the canvas renderer, the SVG serializer, and
 * hit-testing all share one definition of how thick a sample is.
 */
export function strokeWidthAt(base, pressure) {
    if (pressure === undefined)
        return base;
    const p = Math.max(0, Math.min(1, pressure));
    return base * (PRESSURE_MIN + (1 - PRESSURE_MIN) * p);
}
/** Per-segment widths for a pressure stroke: segment i spans points i..i+1. */
export function segmentWidths(points, base) {
    const widths = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = strokeWidthAt(base, points[i].pressure);
        const b = strokeWidthAt(base, points[i + 1].pressure);
        widths.push((a + b) / 2);
    }
    return widths;
}
// ---------------------------------------------------------------- image crop
/**
 * The rect the FULL (uncropped) image would occupy, given the node's visible
 * rect `box` and its crop window. This is where the crop editor draws the
 * ghost image. Flip flags matter because flipping mirrors the rendered
 * content around the node rect's center, so the on-screen position of the
 * uncropped remainder mirrors too.
 */
/**
 * Where an image's `holes` land inside its own rect, in the node's local
 * (pre-flip) space — the same space `drawImage` targets. Holes are stored in
 * source fractions, so they're mapped through the crop window; a hole outside
 * the visible window simply lands outside `box` and clips away.
 *
 * Flips are deliberately NOT applied: renderers flip the whole node rect via
 * the canvas transform, which carries these rects along, keeping a hole stuck
 * to the picture content rather than to the frame.
 */
export function cropHoleRects(box, crop, holes) {
    if (!holes || holes.length === 0)
        return [];
    const c = crop ?? { x: 0, y: 0, w: 1, h: 1 };
    if (c.w <= 0 || c.h <= 0)
        return [];
    return holes.map((h) => ({
        x: box.x + ((h.x - c.x) / c.w) * box.w,
        y: box.y + ((h.y - c.y) / c.h) * box.h,
        w: (h.w / c.w) * box.w,
        h: (h.h / c.h) * box.h,
    }));
}
export function cropFullRect(box, crop, flipX = false, flipY = false) {
    if (!crop)
        return { ...box };
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
export function cropFromRects(box, full, flipX = false, flipY = false) {
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
export function distToSegment(p, a, b) {
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
export function hitTestNode(node, point, tolerance) {
    const p = toLocalPoint(node, point);
    const tol = tolerance + node.style.strokeWidth / 2;
    switch (node.type) {
        case 'rect':
        case 'image':
        case 'text': {
            const filled = node.type !== 'rect' || node.style.fill !== 'transparent';
            const box = getBBox(node);
            // a torn-out hole isn't part of the image — clicks fall through it
            if (node.type === 'image' && node.holes?.length) {
                const inHole = cropHoleRects(box, node.crop, node.holes)
                    .some((h) => pointInBBox(p, h, 0));
                if (inHole)
                    return false;
            }
            if (filled)
                return pointInBBox(p, box, tol);
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
            if (!pointInBBox(p, getBBox(node), tol))
                return false;
            const pts = node.points;
            if (pts.length === 1) {
                const r = strokeWidthAt(node.style.strokeWidth, pts[0].pressure) / 2;
                return Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= tolerance + r;
            }
            // a pressure stroke is thinner where the stylus was light, so each
            // segment gets its own slop instead of the node-wide strokeWidth
            const widths = hasPressure(node) ? segmentWidths(pts, node.style.strokeWidth) : null;
            for (let i = 0; i < pts.length - 1; i++) {
                const segTol = widths ? tolerance + widths[i] / 2 : tol;
                if (distToSegment(p, pts[i], pts[i + 1]) <= segTol)
                    return true;
            }
            return false;
        }
        case 'group':
            if (!pointInBBox(p, getBBox(node), tol))
                return false;
            return node.children.some((c) => hitTestNode(c, p, tolerance));
    }
}
//# sourceMappingURL=geometry.js.map