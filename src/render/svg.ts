import type { DohwaNode, ExportSVGOptions, LineNode, PathNode } from '../types.js';
import {
  diamondPoints,
  getAABB,
  getBBox,
  nodeMatrix,
  trianglePoints,
  unionBBox,
} from '../geometry/geometry.js';
import { isIdentity, toCSS } from '../geometry/matrix.js';
import { arrowHead, LINE_HEIGHT } from './render.js';

const fmt = (n: number): string => String(Math.round(n * 100) / 100);

function escapeXML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styleAttrs(node: DohwaNode): string {
  const { stroke, fill, strokeWidth, opacity } = node.style;
  const parts = [
    `fill="${fill === 'transparent' ? 'none' : fill}"`,
    `stroke="${stroke === 'transparent' ? 'none' : stroke}"`,
    `stroke-width="${fmt(strokeWidth)}"`,
    'stroke-linecap="round"',
    'stroke-linejoin="round"',
  ];
  if (opacity !== 1) parts.push(`opacity="${fmt(opacity)}"`);
  return parts.join(' ');
}

function rotationAttr(node: DohwaNode): string {
  const m = nodeMatrix(node);
  if (isIdentity(m)) return '';
  return ` transform="${toCSS(m)}"`;
}

function pathD(node: PathNode): string {
  const pts = node.points;
  if (pts.length === 0) return '';
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  if (pts.length === 1) return d + ` L ${fmt(pts[0].x + 0.01)} ${fmt(pts[0].y)}`;
  if (pts.length === 2) return d + ` L ${fmt(pts[1].x)} ${fmt(pts[1].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${fmt(pts[i].x)} ${fmt(pts[i].y)} ${fmt(mx)} ${fmt(my)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${fmt(last.x)} ${fmt(last.y)}`;
}

function lineSVG(node: LineNode): string {
  const attr = rotationAttr(node);
  if (!node.arrow) {
    return `<line x1="${fmt(node.x1)}" y1="${fmt(node.y1)}" x2="${fmt(node.x2)}" y2="${fmt(node.y2)}" ${styleAttrs(node)}${attr}/>`;
  }
  const size = Math.max(10, node.style.strokeWidth * 3.2);
  const [a, b] = arrowHead(node.x1, node.y1, node.x2, node.y2, size);
  const line = `<line x1="${fmt(node.x1)}" y1="${fmt(node.y1)}" x2="${fmt(node.x2)}" y2="${fmt(node.y2)}" ${styleAttrs(node)}/>`;
  const head = `<polyline points="${fmt(a.x)},${fmt(a.y)} ${fmt(node.x2)},${fmt(node.y2)} ${fmt(b.x)},${fmt(b.y)}" ${styleAttrs(node)}/>`;
  return `<g${attr}>${line}${head}</g>`;
}

function polygonSVG(node: DohwaNode, pts: { x: number; y: number }[]): string {
  const points = pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
  return `<polygon points="${points}" ${styleAttrs(node)}${rotationAttr(node)}/>`;
}

export function nodeToSVG(node: DohwaNode): string {
  switch (node.type) {
    case 'path':
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
        .map(
          (line, i) =>
            `<tspan x="${fmt(node.x)}" y="${fmt(node.y + i * lh + pad)}">${escapeXML(line) || ' '}</tspan>`,
        )
        .join('');
      const op = node.style.opacity !== 1 ? ` opacity="${fmt(node.style.opacity)}"` : '';
      return `<text font-family="${escapeXML(node.fontFamily)}" font-size="${fmt(node.fontSize)}" fill="${color}" dominant-baseline="text-before-edge"${op}${rotationAttr(node)}>${tspans}</text>`;
    }
    case 'image': {
      const sx = node.flipX ? -1 : 1;
      const sy = node.flipY ? -1 : 1;
      const flip =
        node.flipX || node.flipY
          ? ` transform="translate(${fmt(node.x + node.w / 2)} ${fmt(node.y + node.h / 2)}) scale(${sx} ${sy}) translate(${fmt(-(node.x + node.w / 2))} ${fmt(-(node.y + node.h / 2))})"`
          : '';
      const op = node.style.opacity !== 1 ? ` opacity="${fmt(node.style.opacity)}"` : '';
      const inner = `<image x="${fmt(node.x)}" y="${fmt(node.y)}" width="${fmt(node.w)}" height="${fmt(node.h)}" href="${escapeXML(node.src)}" preserveAspectRatio="none"${op}${flip}/>`;
      const rot = rotationAttr(node);
      return rot ? `<g${rot}>${inner}</g>` : inner;
    }
    case 'group': {
      const op = node.style.opacity !== 1 ? ` opacity="${fmt(node.style.opacity)}"` : '';
      return `<g${op}${rotationAttr(node)}>${node.children.map(nodeToSVG).join('')}</g>`;
    }
  }
}

export function sceneToSVG(nodes: DohwaNode[], options: ExportSVGOptions = {}): string {
  const padding = options.padding ?? 24;
  const box = nodes.length > 0 ? unionBBox(nodes.map(getAABB)) : { x: 0, y: 0, w: 100, h: 100 };
  const x = box.x - padding;
  const y = box.y - padding;
  const w = box.w + padding * 2;
  const h = box.h + padding * 2;
  const bg = options.background
    ? `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${options.background}"/>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(x)} ${fmt(y)} ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}">` +
    bg +
    nodes.map(nodeToSVG).join('') +
    `</svg>`
  );
}
