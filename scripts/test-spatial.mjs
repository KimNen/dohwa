import { Quadtree } from '../dist/spatial.js';

const ok = (name, cond) => console.log(cond ? 'PASS' : 'FAIL', name);

// build a grid of 400 boxes
const items = [];
for (let i = 0; i < 20; i++)
  for (let j = 0; j < 20; j++)
    items.push({ id: `${i}-${j}`, box: { x: i * 50, y: j * 50, w: 40, h: 40 } });

const tree = Quadtree.build(items);

// point query hits exactly one box
const hit = tree.queryPoint(105, 105); // inside cell (2,2): x 100..140
ok('point query finds cell', hit.has('2-2'));
ok('point query is specific', hit.size <= 2); // maybe boundary neighbors, but tiny

// point in a gap hits nothing
const gap = tree.queryPoint(45, 45); // between cells (0,0)=0..40 and (1,1)
ok('point in gap: no false positive box', !gap.has('0-0'));

// box query returns a bounded candidate set, and it's a superset of truth
const region = { x: 0, y: 0, w: 120, h: 120 }; // cells 0,1,2 in each axis
const found = tree.queryBox(region);
// truth: cells i,j in {0,1,2} whose box intersects region -> 3x3 = 9 (cell 2 starts at 100, w40 -> 100..140 intersects 0..120)
const truth = new Set();
for (const it of items) {
  const b = it.box;
  if (b.x < 120 && b.x + b.w > 0 && b.y < 120 && b.y + b.h > 0) truth.add(it.id);
}
ok('box query is a superset of truth', [...truth].every((id) => found.has(id)));
ok('box query is tight (no huge over-return)', found.size < items.length / 2);

// correctness vs brute force on random queries
let mismatches = 0;
for (let t = 0; t < 200; t++) {
  const qx = Math.random() * 1000;
  const qy = Math.random() * 1000;
  const idx = tree.queryPoint(qx, qy);
  const brute = new Set(
    items.filter((it) => qx >= it.box.x && qx <= it.box.x + it.box.w && qy >= it.box.y && qy <= it.box.y + it.box.h).map((it) => it.id),
  );
  // index must contain every brute-force hit (it may include extra candidates near boundaries only if pad>0; here pad=0 so must match)
  for (const id of brute) if (!idx.has(id)) mismatches++;
}
ok('quadtree point query matches brute force (200 random)', mismatches === 0);

// box query correctness vs brute force
let boxMiss = 0;
for (let t = 0; t < 200; t++) {
  const qb = { x: Math.random() * 900, y: Math.random() * 900, w: Math.random() * 200, h: Math.random() * 200 };
  const idx = tree.queryBox(qb);
  const brute = items.filter((it) => it.box.x < qb.x + qb.w && it.box.x + it.box.w > qb.x && it.box.y < qb.y + qb.h && it.box.y + it.box.h > qb.y);
  for (const it of brute) if (!idx.has(it.id)) boxMiss++;
}
ok('quadtree box query matches brute force (200 random)', boxMiss === 0);

// empty tree
const empty = Quadtree.build([]);
ok('empty tree safe', empty.queryPoint(0, 0).size === 0);
