import { diamondPoints, getAABB, getBBox, hasPressure, nodeMatrix, segmentWidths, strokeWidthAt, trianglePoints, unionBBox, } from '../geometry/geometry.js';
import { isIdentity, toCSS } from '../geometry/matrix.js';
import { arrowHead, LINE_HEIGHT } from './render.js';
const fmt = (n) => String(Math.round(n * 100) / 100);
function escapeXML(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function styleAttrs(node) {
    const { stroke, fill, strokeWidth, opacity } = node.style;
    const parts = [
        `fill="${fill === 'transparent' ? 'none' : fill}"`,
        `stroke="${stroke === 'transparent' ? 'none' : stroke}"`,
        `stroke-width="${fmt(strokeWidth)}"`,
        'stroke-linecap="round"',
        'stroke-linejoin="round"',
    ];
    if (opacity !== 1)
        parts.push(`opacity="${fmt(opacity)}"`);
    return parts.join(' ');
}
function rotationAttr(node) {
    const m = nodeMatrix(node);
    if (isIdentity(m))
        return '';
    return ` transform="${toCSS(m)}"`;
}
function pathD(node) {
    const pts = node.points;
    if (pts.length === 0)
        return '';
    let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
    if (pts.length === 1)
        return d + ` L ${fmt(pts[0].x + 0.01)} ${fmt(pts[0].y)}`;
    if (pts.length === 2)
        return d + ` L ${fmt(pts[1].x)} ${fmt(pts[1].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        d += ` Q ${fmt(pts[i].x)} ${fmt(pts[i].y)} ${fmt(mx)} ${fmt(my)}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L ${fmt(last.x)} ${fmt(last.y)}`;
}
function lineSVG(node) {
    const attr = rotationAttr(node);
    if (!node.arrow && !node.arrowStart) {
        return `<line x1="${fmt(node.x1)}" y1="${fmt(node.y1)}" x2="${fmt(node.x2)}" y2="${fmt(node.y2)}" ${styleAttrs(node)}${attr}/>`;
    }
    const size = Math.max(10, node.style.strokeWidth * 3.2);
    const head = (fromX, fromY, atX, atY) => {
        const [a, b] = arrowHead(fromX, fromY, atX, atY, size);
        return `<polyline points="${fmt(a.x)},${fmt(a.y)} ${fmt(atX)},${fmt(atY)} ${fmt(b.x)},${fmt(b.y)}" ${styleAttrs(node)}/>`;
    };
    const line = `<line x1="${fmt(node.x1)}" y1="${fmt(node.y1)}" x2="${fmt(node.x2)}" y2="${fmt(node.y2)}" ${styleAttrs(node)}/>`;
    const heads = (node.arrow ? head(node.x1, node.y1, node.x2, node.y2) : '') +
        (node.arrowStart ? head(node.x2, node.y2, node.x1, node.y1) : '');
    return `<g${attr}>${line}${heads}</g>`;
}
/**
 * A pressure stroke as a group of per-segment paths, each with its own
 * stroke-width — SVG has no variable-width stroke, so this mirrors what the
 * canvas renderer does (and reuses its width math).
 */
function pressurePathSVG(node) {
    const pts = node.points;
    const { stroke, strokeWidth, opacity } = node.style;
    if (stroke === 'transparent' || strokeWidth <= 0 || pts.length === 0)
        return '';
    const groupAttrs = [
        `stroke="${stroke}"`,
        'fill="none"',
        'stroke-linecap="round"',
        'stroke-linejoin="round"',
    ];
    if (opacity !== 1)
        groupAttrs.push(`opacity="${fmt(opacity)}"`);
    if (pts.length === 1) {
        const r = strokeWidthAt(strokeWidth, pts[0].pressure) / 2;
        return `<g ${groupAttrs.join(' ')}${rotationAttr(node)}><circle cx="${fmt(pts[0].x)}" cy="${fmt(pts[0].y)}" r="${fmt(r)}" fill="${stroke}"/></g>`;
    }
    const widths = segmentWidths(pts, strokeWidth);
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const d = `M ${fmt(pts[i].x)} ${fmt(pts[i].y)} L ${fmt(pts[i + 1].x)} ${fmt(pts[i + 1].y)}`;
        segs.push(`<path d="${d}" stroke-width="${fmt(widths[i])}"/>`);
    }
    return `<g ${groupAttrs.join(' ')}${rotationAttr(node)}>${segs.join('')}</g>`;
}
function polygonSVG(node, pts) {
    const points = pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
    return `<polygon points="${points}" ${styleAttrs(node)}${rotationAttr(node)}/>`;
}
export function nodeToSVG(node) {
    switch (node.type) {
        case 'path':
            if (hasPressure(node))
                return pressurePathSVG(node);
            return `<path d="${pathD(node)}" ${styleAttrs(node)}${rotationAttr(node)}/>`;
        case 'rect':
            return `<rect x="${fmt(node.x)}" y="${fmt(node.y)}" width="${fmt(node.w)}" height="${fmt(node.h)}"${node.rx ? ` rx="${fmt(node.rx)}"` : ''} ${styleAttrs(node)}${rotationAttr(node)}/>`;
        case 'ellipse':
            return `<ellipse cx="${fmt(node.x + node.w / 2)}" cy="${fmt(node.y + node.h / 2)}" rx="${fmt(node.w / 2)}" ry="${fmt(node.h / 2)}" ${styleAttrs(node)}${rotationAttr(node)}/>`;
        case 'diamond':
            return polygonSVG(node, diamondPoints(getBBox(node)));
        case 'triangle':
            return polygonSVG(node, trianglePoints(getBBox(node), node.flipY));
        case 'line':
            return lineSVG(node);
        case 'text': {
            const lh = node.fontSize * LINE_HEIGHT;
            const pad = (lh - node.fontSize) / 2;
            const color = node.style.stroke === 'transparent' ? '#000' : node.style.stroke;
            const tspans = node.text
                .split('\n')
                .map((line, i) => `<tspan x="${fmt(node.x)}" y="${fmt(node.y + i * lh + pad)}">${escapeXML(line) || ' '}</tspan>`)
                .join('');
            const op = node.style.opacity !== 1 ? ` opacity="${fmt(node.style.opacity)}"` : '';
            return `<text font-family="${escapeXML(node.fontFamily)}" font-size="${fmt(node.fontSize)}" fill="${color}" dominant-baseline="text-before-edge"${op}${rotationAttr(node)}>${tspans}</text>`;
        }
        case 'image': {
            const sx = node.flipX ? -1 : 1;
            const sy = node.flipY ? -1 : 1;
            const flip = node.flipX || node.flipY
                ? ` transform="translate(${fmt(node.x + node.w / 2)} ${fmt(node.y + node.h / 2)}) scale(${sx} ${sy}) translate(${fmt(-(node.x + node.w / 2))} ${fmt(-(node.y + node.h / 2))})"`
                : '';
            const op = node.style.opacity !== 1 ? ` opacity="${fmt(node.style.opacity)}"` : '';
            let inner;
            if (node.crop) {
                // Draw the full image scaled so the crop window fills the node rect,
                // clipped to the node rect. Sizes derive from fractions alone —
                // no natural pixel size needed.
                const c = node.crop;
                const fw = node.w / c.w;
                const fh = node.h / c.h;
                const fx = node.x - c.x * fw;
                const fy = node.y - c.y * fh;
                const clipId = `dohwa-crop-${node.id}`;
                inner =
                    `<g${op}${flip}>` +
                        `<clipPath id="${clipId}"><rect x="${fmt(node.x)}" y="${fmt(node.y)}" width="${fmt(node.w)}" height="${fmt(node.h)}"/></clipPath>` +
                        `<image x="${fmt(fx)}" y="${fmt(fy)}" width="${fmt(fw)}" height="${fmt(fh)}" href="${escapeXML(node.src)}" preserveAspectRatio="none" clip-path="url(#${clipId})"/>` +
                        `</g>`;
            }
            else {
                inner = `<image x="${fmt(node.x)}" y="${fmt(node.y)}" width="${fmt(node.w)}" height="${fmt(node.h)}" href="${escapeXML(node.src)}" preserveAspectRatio="none"${op}${flip}/>`;
            }
            const rot = rotationAttr(node);
            return rot ? `<g${rot}>${inner}</g>` : inner;
        }
        case 'group': {
            const op = node.style.opacity !== 1 ? ` opacity="${fmt(node.style.opacity)}"` : '';
            return `<g${op}${rotationAttr(node)}>${node.children.map(nodeToSVG).join('')}</g>`;
        }
    }
}
export function sceneToSVG(nodes, options = {}) {
    const padding = options.padding ?? 24;
    const box = nodes.length > 0 ? unionBBox(nodes.map(getAABB)) : { x: 0, y: 0, w: 100, h: 100 };
    const x = box.x - padding;
    const y = box.y - padding;
    const w = box.w + padding * 2;
    const h = box.h + padding * 2;
    const bg = options.background
        ? `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${options.background}"/>`
        : '';
    return (`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}">` +
        bg +
        nodes.map(nodeToSVG).join('') +
        `</svg>`);
}
//# sourceMappingURL=svg.js.map