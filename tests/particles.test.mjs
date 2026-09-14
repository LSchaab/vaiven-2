import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerp, easeInOutCubic, rotateY, project, PARTICLE_COUNT } from '../particles.js';

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
