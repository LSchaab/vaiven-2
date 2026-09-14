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
