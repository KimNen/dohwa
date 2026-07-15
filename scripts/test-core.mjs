import {
  getBBox, getAABB, hitTestNode, translateNode, scaleNodeInto,
  flipNode, rotatePoint, sceneToSVG, History,
} from '../dist/index.js';

const ok = (name, cond) => console.log(cond ? 'PASS' : 'FAIL', name);
const style = { stroke: '#000', fill: 'transparent', strokeWidth: 2, opacity: 1 };
const clone = (v) => JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------- geometry
const rect = { id: 'a', type: 'rect', x: 10, y: 10, w: 100, h: 50, style: { ...style } };
const path = { id: 'b', type: 'path', points: [{x:0,y:0},{x:50,y:50},{x:100,y:0}], style: { ...style } };
const group = { id: 'g', type: 'group', style: { ...style }, children: [clone(rect), clone(path)] };

ok('bbox rect', getBBox(rect).w === 100);
ok('bbox group spans children', getBBox(group).w === 110 && getBBox(group).h === 60);
ok('hit rect edge', hitTestNode(rect, { x: 10, y: 30 }, 2) === true);
ok('miss rect center (unfilled)', hitTestNode(rect, { x: 60, y: 35 }, 2) === false);

const filled = { ...clone(rect), style: { ...style, fill: '#fff' } };
ok('hit rect center (filled)', hitTestNode(filled, { x: 60, y: 35 }, 2) === true);
ok('hit path segment', hitTestNode(path, { x: 25, y: 25 }, 2) === true);
ok('miss path', hitTestNode(path, { x: 25, y: 60 }, 2) === false);

// ---------------------------------------------------------------- transforms
const g2 = clone(group);
translateNode(g2, 10, 10);
ok('translate group', getBBox(g2).x === 10 && getBBox(g2).y === 10);

const from = getBBox(g2);
const scaled = clone(g2);
scaleNodeInto(scaled, from, { x: from.x, y: from.y, w: from.w * 2, h: from.h * 2 });
const after = getBBox(scaled);
ok('scale 2x', Math.abs(after.w - from.w * 2) < 1e-9 && Math.abs(after.h - from.h * 2) < 1e-9);

// ---------------------------------------------------------------- history
const h = new History('s0');
h.push('s1');
h.push('s2');
ok('undo walks back', h.undo() === 's1' && h.undo() === 's0');
ok('canUndo exhausted', h.canUndo === false);
ok('redo walks forward', h.redo() === 's1');
h.push('s9');
ok('push drops redo branch', h.redo() === null && h.canRedo === false);

// ---------------------------------------------------------------- rotation
const rot = { id: 'r', type: 'rect', x: 0, y: 0, w: 100, h: 20, rotation: Math.PI / 2, style: { ...style } };
const aabb = getAABB(rot);
ok('rotated AABB swaps w/h', Math.abs(aabb.w - 20) < 1e-6 && Math.abs(aabb.h - 100) < 1e-6);

const edge = rotatePoint({ x: 100, y: 10 }, { x: 50, y: 10 }, Math.PI / 2);
ok('rotation-aware hit', hitTestNode(rot, edge, 2) === true);
ok('rotation-aware miss (pre-rotation pos)', hitTestNode(rot, { x: 100, y: 10 }, 2) === false);

// ---------------------------------------------------------------- polygons
const dia = { id: 'd', type: 'diamond', x: 0, y: 0, w: 100, h: 100, style: { ...style, fill: '#f00' } };
ok('diamond center hit', hitTestNode(dia, { x: 50, y: 50 }, 2) === true);
ok('diamond corner miss', hitTestNode(dia, { x: 5, y: 5 }, 1) === false);

const tri = { id: 't', type: 'triangle', x: 0, y: 0, w: 100, h: 100, style: { ...style, fill: '#0f0' } };
ok('triangle apex-up: corner miss', hitTestNode(tri, { x: 6, y: 6 }, 1) === false);
flipNode(tri, 'v', { x: 50, y: 50 });
ok('flipV toggles triangle', hitTestNode(tri, { x: 6, y: 6 }, 1) === true);

const line = { id: 'l', type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, style: { ...style } };
flipNode(line, 'h', { x: 50, y: 0 });
ok('flipH mirrors line', line.x1 === 100 && line.x2 === 0);

// ---------------------------------------------------------------- svg
const all = [
  { id:'1', type:'path', points:[{x:0,y:0},{x:10,y:10},{x:20,y:0}], style:{...style} },
  { id:'2', type:'rect', x:0,y:0,w:50,h:30, rx:6, rotation:0.3, style:{...style, fill:'#eee'} },
  { id:'3', type:'ellipse', x:10,y:10,w:40,h:20, style:{...style} },
  { id:'4', type:'diamond', x:0,y:0,w:30,h:30, style:{...style} },
  { id:'5', type:'triangle', x:0,y:0,w:30,h:30, flipY:true, style:{...style} },
  { id:'6', type:'line', x1:0,y1:0,x2:50,y2:50, arrow:true, style:{...style} },
  { id:'7', type:'text', x:5,y:5, text:'안녕<&>"\nworld', fontSize:20, fontFamily:'serif', w:80, h:52, style:{...style} },
  { id:'8', type:'image', x:0,y:0,w:40,h:40, src:'data:image/png;base64,xx', flipX:true, style:{...style} },
  { id:'9', type:'group', rotation:0.5, style:{...style, opacity:0.8}, children:[
    { id:'9a', type:'rect', x:0,y:0,w:10,h:10, style:{...style} },
  ]},
];
const svg = sceneToSVG(all, { background: '#fff' });
ok('svg covers every node type',
  ['<path','<rect','<ellipse','<polygon','<line','<text','<image','<g'].every((tag) => svg.includes(tag)));
ok('svg escapes XML', svg.includes('안녕&lt;&amp;&gt;&quot;'));
ok('svg emits transform matrix', svg.includes('matrix('));
ok('svg well-formed', svg.startsWith('<svg') && svg.endsWith('</svg>'));
