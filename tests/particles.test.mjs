import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerp, easeInOutCubic, rotateY, project, PARTICLE_COUNT, createParticles, shapePunto, shapeCirculo, shapeCinco, sampleCanvasPixels, maskDarkOpaque, setTargets, morphStep, PALETTE, duotoneColor } from '../particles.js';

test('lerp interpola los extremos y el medio', () => {
  assert.equal(lerp(0, 10, 0), 0);
  assert.equal(lerp(0, 10, 1), 10);
  assert.equal(lerp(0, 10, 0.5), 5);
});

test('easeInOutCubic fija los extremos y el medio', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.ok(Math.abs(easeInOutCubic(0.5) - 0.5) < 1e-9);
});

test('rotateY 0 no cambia nada; 90° manda x a -z', () => {
  const p = { x: 1, y: 0.5, z: 0 };
  const r0 = rotateY(p, 0);
  assert.ok(Math.abs(r0.x - 1) < 1e-9 && Math.abs(r0.z) < 1e-9);
  assert.equal(r0.y, 0.5); // y no rota
  const r90 = rotateY(p, Math.PI / 2);
  assert.ok(Math.abs(r90.x) < 1e-9, 'x ~ 0');
  assert.ok(Math.abs(r90.z - (-1)) < 1e-9, 'z ~ -1');
});

test('project: z negativo (más cerca) da scale > 1; z positivo da scale < 1', () => {
  const opts = { fov: 6, depth: 4, size: 100, cx: 500, cy: 300 };
  const near = project({ x: 0, y: 0, z: -0.15 }, opts);
  const far = project({ x: 0, y: 0, z: 0.15 }, opts);
  assert.ok(near.scale > 1, 'cerca agranda');
  assert.ok(far.scale < 1, 'lejos achica');
  // en el centro (x=0,y=0) la proyección cae en (cx,cy)
  assert.equal(near.sx, 500);
  assert.equal(near.sy, 300);
});

test('PARTICLE_COUNT arranca en 4000', () => {
  assert.equal(PARTICLE_COUNT, 4000);
});

const rngSeq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('createParticles: largo correcto y los 10 campos en cero salvo seed', () => {
  const ps = createParticles(3, rngSeq([0.1, 0.2, 0.3]));
  assert.equal(ps.length, 3);
  for (const k of ['x','y','z','tx','ty','tz','ox','oy','oz']) assert.equal(ps[0][k], 0);
  assert.ok(ps[0].seed >= 0 && ps[0].seed < 1);
});

test('shapePunto: todas dentro de un radio chico (~0.02) en el plano', () => {
  const pts = shapePunto(500);
  for (const p of pts) {
    const r = Math.hypot(p.x, p.y);
    assert.ok(r <= 0.02 + 1e-9, `r=${r} debe ser <= 0.02`);
    assert.ok(Math.abs(p.z) <= 0.15 + 1e-9);
  }
  assert.equal(pts.length, 500);
});

test('shapeCirculo: disco lleno de radio <= 1 y espesor z en banda fina', () => {
  const pts = shapeCirculo(500);
  for (const p of pts) {
    assert.ok(Math.hypot(p.x, p.y) <= 1 + 1e-9);
    assert.ok(Math.abs(p.z) <= 0.15 + 1e-9);
  }
});

test('shapeCinco: los puntos caen en 5 cúmulos alrededor de 5 centros', () => {
  const centers = [ [0,0], [-0.6,0.6], [0.6,0.6], [-0.6,-0.6], [0.6,-0.6] ];
  const pts = shapeCinco(1000);
  for (const p of pts) {
    const nearest = Math.min(...centers.map(([cx,cy]) => Math.hypot(p.x-cx, p.y-cy)));
    assert.ok(nearest <= 0.25 + 1e-9, `punto lejos de todo centro: ${nearest}`);
  }
});

test('sampleCanvasPixels: solo píxeles alpha>128, normalizados a [-1,1]', () => {
  // imagen 2x2: solo el píxel (1,0) es opaco (alpha 255), el resto transparente
  const width = 2, height = 2;
  const data = new Uint8ClampedArray(2 * 2 * 4); // todo 0 (alpha 0)
  const opaqueIndex = (0 * width + 1); // fila 0, col 1
  data[opaqueIndex * 4 + 3] = 255;     // alpha del píxel opaco
  const pts = sampleCanvasPixels({ data, width, height }, 10);
  assert.equal(pts.length, 10);
  for (const p of pts) {
    assert.ok(p.x >= -1 - 1e-9 && p.x <= 1 + 1e-9);
    assert.ok(p.y >= -1 - 1e-9 && p.y <= 1 + 1e-9);
    assert.ok(Math.abs(p.z) <= 0.15 + 1e-9);
    // todos deben salir del único píxel opaco (col 1, fila 0) → mismo x,y
    assert.ok(Math.abs(p.x - pts[0].x) < 1e-9 && Math.abs(p.y - pts[0].y) < 1e-9);
  }
});

test('maskDarkOpaque conserva solo pixeles opacos Y oscuros', () => {
  const width = 4, height = 1;
  const data = new Uint8ClampedArray(4 * 4);
  const set = (i, r, g, b, a) => { data[i*4]=r; data[i*4+1]=g; data[i*4+2]=b; data[i*4+3]=a; };
  set(0, 10, 10, 10, 255);    // negro opaco  → conservar
  set(1, 255, 255, 255, 255); // blanco opaco → descartar (claro)
  set(2, 0, 0, 0, 0);         // transparente → descartar
  set(3, 40, 40, 40, 255);    // gris oscuro opaco → conservar (lum 40 < 128)
  const m = maskDarkOpaque({ data, width, height });
  assert.equal(m.data[0*4 + 3], 255, 'negro opaco conservado');
  assert.equal(m.data[1*4 + 3], 0,   'blanco descartado');
  assert.equal(m.data[2*4 + 3], 0,   'transparente descartado');
  assert.equal(m.data[3*4 + 3], 255, 'gris oscuro conservado');
  assert.equal(m.width, 4); assert.equal(m.height, 1);
});

test('setTargets snapshotea el origen y fija el objetivo; morphStep interpola', () => {
  const ps = createParticles(1, () => 0.5);
  ps[0].x = ps[0].y = ps[0].z = 0; // en el origen
  setTargets(ps, [{ x: 1, y: 2, z: 0.1 }]);
  assert.deepEqual([ps[0].ox, ps[0].oy, ps[0].oz], [0, 0, 0]);
  assert.deepEqual([ps[0].tx, ps[0].ty, ps[0].tz], [1, 2, 0.1]);
  morphStep(ps, 0);
  assert.ok(Math.abs(ps[0].x - 0) < 1e-9, 'progress 0 = origen');
  morphStep(ps, 1);
  assert.ok(Math.abs(ps[0].x - 1) < 1e-9 && Math.abs(ps[0].y - 2) < 1e-9, 'progress 1 = objetivo');
});

test('PALETTE tiene los hex canonicos (azul #2222a0, NO #3A39FF)', () => {
  assert.equal(PALETTE.azul.toLowerCase(), '#2222a0');
  assert.equal(PALETTE.naranja.toUpperCase(), '#FF5B23');
  assert.equal(PALETTE.violeta.toUpperCase(), '#511F99');
  assert.equal(PALETTE.amarillo.toUpperCase(), '#FFCC00');
  assert.equal(PALETTE.lila.toUpperCase(), '#B4B4ED');
  assert.equal(PALETTE['gris-claro'].toUpperCase(), '#D9D2CC');
  assert.equal(PALETTE['verde-agua'].toUpperCase(), '#ADE6ED');
  assert.equal(PALETTE.verde.toUpperCase(), '#167A72');
  assert.equal(PALETTE['azul-oscuro'].toUpperCase(), '#1A237E');
});

test('duotoneColor: mix=0 devuelve el color del par segun el seed', () => {
  // seed < 0.5 → hexA ; seed >= 0.5 → hexB
  assert.equal(duotoneColor(0.1, 0, PALETTE.naranja, PALETTE.azul), 'rgb(255,91,35)');   // #FF5B23
  assert.equal(duotoneColor(0.9, 0, PALETTE.naranja, PALETTE.azul), 'rgb(34,34,160)');    // #2222a0
});

test('duotoneColor: mix=1 desatura al COLOR ANCLA secundario (no gris)', () => {
  // default ancla = lila #B4B4ED = rgb(180,180,237)
  assert.equal(duotoneColor(0.1, 1, PALETTE.naranja, PALETTE.azul), 'rgb(180,180,237)');
  assert.equal(duotoneColor(0.9, 1, PALETTE.naranja, PALETTE.azul), 'rgb(180,180,237)');
  // ancla explícita (verde #167A72 = rgb(22,122,114))
  assert.equal(duotoneColor(0.9, 1, PALETTE.naranja, PALETTE.azul, PALETTE.verde), 'rgb(22,122,114)');
});
