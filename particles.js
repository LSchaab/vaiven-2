// particles.js — sistema de partículas del SPEC §3.
// Capa 1: funciones PURAS (sin globals del navegador en el top-level; Node las testea).

export const PARTICLE_COUNT = 4000;

export const lerp = (a, b, t) => a + (b - a) * t;

export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Rotación sobre el eje Y (SPEC §3: se aplica a x y z antes de proyectar).
export function rotateY(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

// Proyección en perspectiva simple (SPEC §3).
export function project(p, { fov, depth, size, cx, cy }) {
  const scale = fov / (fov + p.z * depth);
  return { sx: cx + p.x * scale * size, sy: cy + p.y * scale * size, scale };
}

// Capa 1 (cont.): modelo de partícula, formas puras, muestreo, interpolación.

export function createParticles(count, rng = Math.random) {
  const arr = new Array(count);
  for (let i = 0; i < count; i++) {
    arr[i] = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, ox: 0, oy: 0, oz: 0, seed: rng() };
  }
  return arr;
}

const Z_BAND = 0.15; // banda fina de espesor (SPEC §3: z en -0.15..0.15)
const zJitter = (rng) => (rng() - 0.5) * 2 * Z_BAND;

export function shapePunto(count, rng = Math.random) {
  const pts = new Array(count);
  for (let i = 0; i < count; i++) {
    const r = 0.02 * Math.sqrt(rng());
    const a = rng() * Math.PI * 2;
    pts[i] = { x: Math.cos(a) * r, y: Math.sin(a) * r, z: zJitter(rng) };
  }
  return pts;
}

export function shapeCirculo(count, rng = Math.random) {
  const pts = new Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rng()); // uniforme sobre el disco de radio 1
    const a = rng() * Math.PI * 2;
    pts[i] = { x: Math.cos(a) * r, y: Math.sin(a) * r, z: zJitter(rng) };
  }
  return pts;
}

const CINCO_CENTERS = [ [0, 0], [-0.6, 0.6], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6] ];
export function shapeCinco(count, rng = Math.random) {
  const pts = new Array(count);
  for (let i = 0; i < count; i++) {
    const [cx, cy] = CINCO_CENTERS[i % 5];
    const r = 0.22 * Math.sqrt(rng());
    const a = rng() * Math.PI * 2;
    pts[i] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, z: zJitter(rng) };
  }
  return pts;
}

// Núcleo puro del muestreo: recibe un ImageData-like {data, width, height}.
// Elige `count` píxeles con alpha > 128, normaliza a [-1,1] preservando aspecto
// (centro en el medio, y invertido porque el canvas crece hacia abajo).
export function sampleCanvasPixels(imageData, count, rng = Math.random) {
  const { data, width, height } = imageData;
  const opaque = [];
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] > 128) opaque.push(i);
  }
  if (opaque.length === 0) return shapeCirculo(count, rng); // salvavidas: imagen vacía
  const maxDim = Math.max(width, height);
  const pts = new Array(count);
  for (let k = 0; k < count; k++) {
    const idx = opaque[(rng() * opaque.length) | 0];
    const px = idx % width;
    const py = (idx / width) | 0;
    pts[k] = {
      x: (px - width / 2) / (maxDim / 2),
      y: -((py - height / 2) / (maxDim / 2)),
      z: zJitter(rng),
    };
  }
  return pts;
}

// Fija objetivo (tx,ty,tz) y snapshotea la posición actual como origen (ox,oy,oz).
export function setTargets(particles, points) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i], q = points[i];
    p.ox = p.x; p.oy = p.y; p.oz = p.z;
    p.tx = q.x; p.ty = q.y; p.tz = q.z;
  }
}

// Interpola cada partícula entre origen y objetivo según progress (0..1) con easing.
export function morphStep(particles, progress, ease = easeInOutCubic) {
  const t = ease(Math.min(1, Math.max(0, progress)));
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x = lerp(p.ox, p.tx, t);
    p.y = lerp(p.oy, p.ty, t);
    p.z = lerp(p.oz, p.tz, t);
  }
}
