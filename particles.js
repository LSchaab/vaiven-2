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

// Aísla una silueta OSCURA sobre cualquier fondo: deja opacos (alpha=255) solo
// los píxeles que ya eran opacos Y oscuros (luminancia < umbral); el resto alpha=0.
// Necesario porque el cerebro real es negro sobre fondo blanco opaco: sin esto,
// sampleCanvasPixels (que filtra alpha>128) muestrearía el rectángulo entero.
export function maskDarkOpaque(imageData, lumThreshold = 128) {
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < width * height; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const keep = a > 128 && lum < lumThreshold;
    out[i*4] = r; out[i*4+1] = g; out[i*4+2] = b; out[i*4+3] = keep ? 255 : 0;
  }
  return { data: out, width, height };
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

// Muestreo de imagen y cerebro placeholder (browser). Usan document/Image pero SOLO
// dentro del cuerpo (en runtime); no se ejecuta nada de esto al importar el módulo.

// Carga un PNG y lo muestrea (SPEC §3: canvas oculto → getImageData → sampleCanvasPixels).
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function sampleShape(imagePath, count) {
  const img = await loadImage(imagePath);
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  // encajar preservando aspecto, centrado
  const scale = Math.min(S / img.width, S / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
  return sampleCanvasPixels(maskDarkOpaque(ctx.getImageData(0, 0, S, S)), count);
}

// Silueta de cerebro PLACEHOLDER dibujada por código (mientras no está el PNG real).
// Dos lóbulos + bultos → forma rellena reconocible como "cerebro-ish". Se reemplaza
// por sampleShape('resources/cerebro.png', count) cuando llegue el asset real.
export function placeholderBrainPoints(count) {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  const blob = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  blob(S * 0.50, S * 0.50, S * 0.34, S * 0.26); // masa central
  blob(S * 0.36, S * 0.44, S * 0.15, S * 0.15); // lóbulo izq
  blob(S * 0.64, S * 0.44, S * 0.15, S * 0.15); // lóbulo der
  blob(S * 0.50, S * 0.36, S * 0.18, S * 0.13); // frontal
  blob(S * 0.50, S * 0.64, S * 0.20, S * 0.12); // cerebelo
  return sampleCanvasPixels(ctx.getImageData(0, 0, S, S), count);
}

// Capa 2: la clase que orquesta (browser). NADA de esto corre al importar el módulo:
// todo acceso a document/window/rAF vive dentro de métodos.

export class ParticleSystem {
  constructor(canvas, { count = PARTICLE_COUNT } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.count = count;
    this.particles = createParticles(count);
    this.rotation = 0;
    this.rotationSpeed = 0.3; // rad/s
    this.fov = 6; this.depth = 4;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.running = false;
    this._lastT = 0;
    this._seedShape(shapeCirculo(count));
    this._resize();
    window.addEventListener('resize', () => this._resize());
    // formas precalculadas UNA vez (SPEC §3). El cerebro se registra async aparte.
    this._shapes = {
      punto: shapePunto(count),
      circulo: shapeCirculo(count),
      cinco: shapeCinco(count),
      cerebro: placeholderBrainPoints(count),
    };
    this._shapeName = 'circulo';
    this._progress = 1;
    this._animating = false;
    this._morphStart = 0;
    this.morphDuration = 1.2; // segundos
  }

  registerShape(name, points) {
    this._shapes[name] = points; // permite inyectar el cerebro real (async) después
  }

  // Arranca una transición animada hacia `shapeName` (progress 0→1 en morphDuration).
  morphTo(shapeName) {
    const pts = this._shapes[shapeName];
    if (!pts) return;
    setTargets(this.particles, pts);      // snapshot del origen + nuevo objetivo
    this._shapeName = shapeName;
    if (this.reducedMotion) {              // reduced-motion: salto directo a la forma final
      this._progress = 1; this._animating = false;
      morphStep(this.particles, 1);
    } else {
      this._progress = 0; this._animating = true;
      this._morphStart = performance.now();
    }
  }

  // Scrub manual del morph actual (para el slider del lab / y para el scroll en M3).
  setProgressManual(v) {
    this._animating = false;
    this._progress = v;
    morphStep(this.particles, v);
  }

  // Coloca las partículas directamente en una forma (posición y origen y objetivo).
  _seedShape(points) {
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i], q = points[i];
      p.x = p.ox = p.tx = q.x;
      p.y = p.oy = p.ty = q.y;
      p.z = p.oz = p.tz = q.z;
    }
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastT = performance.now();
    requestAnimationFrame(this._frame.bind(this));
  }

  stop() { this.running = false; }

  _frame(now) {
    if (!this.running) return;
    const dt = (now - this._lastT) / 1000;
    this._lastT = now;
    if (!this.reducedMotion) this.rotation += this.rotationSpeed * dt;
    if (this._animating) {
      this._progress = Math.min(1, (now - this._morphStart) / 1000 / this.morphDuration);
      morphStep(this.particles, this._progress);
      if (this._progress >= 1) this._animating = false;
    }
    this._render();
    requestAnimationFrame(this._frame.bind(this));
  }

  _clear() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  _render() {
    const ctx = this.ctx;
    const w = window.innerWidth, h = window.innerHeight;
    this._clear();
    const cx = w / 2, cy = h / 2, size = Math.min(w, h) * 0.42;
    ctx.fillStyle = '#000';
    for (let i = 0; i < this.count; i++) {
      const rp = rotateY(this.particles[i], this.rotation);
      const { sx, sy, scale } = project(rp, { fov: this.fov, depth: this.depth, size, cx, cy });
      const s = scale > 1 ? 2 : 1;
      ctx.fillRect(sx, sy, s, s);
    }
  }
}
