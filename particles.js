// particles.js — sistema de partículas del SPEC §3.
// Capa 1: funciones PURAS (sin globals del navegador en el top-level; Node las testea).

export const PARTICLE_COUNT = 4000;

export const lerp = (a, b, t) => a + (b - a) * t;

export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Paleta canónica (espeja los tokens de home.css). Azul = #2222a0 (design doc §7.5).
export const PALETTE = {
  naranja: '#FF5B23', azul: '#2222a0',
  violeta: '#511F99', amarillo: '#FFCC00',
  // secundarios (paleta "apagada y sobria")
  'gris-claro': '#D9D2CC', lila: '#B4B4ED', 'verde-agua': '#ADE6ED',
  verde: '#167A72', 'azul-oscuro': '#1A237E',
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

// seed elige el extremo del duotono; mix 0=color (impulso), 1=color ancla (secundario).
export function duotoneColor(seed, mix, hexA, hexB, anclaHex = '#B4B4ED') {
  const base = seed < 0.5 ? hexToRgb(hexA) : hexToRgb(hexB);
  const anc = hexToRgb(anclaHex);
  const r = Math.round(lerp(base.r, anc.r, mix));
  const g = Math.round(lerp(base.g, anc.g, mix));
  const b = Math.round(lerp(base.b, anc.b, mix));
  return `rgb(${r},${g},${b})`;
}

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
      y: (py - height / 2) / (maxDim / 2),
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

// Dilata una máscara (alpha 255 = keep) por `radius` píxeles (elemento cuadrado,
// separable). Cierra huecos finos (los surcos del cerebro) para una silueta maciza.
export function dilateMask(imageData, radius = 4) {
  const { data, width, height } = imageData;
  const N = width * height;
  const src = new Uint8Array(N);
  for (let i = 0; i < N; i++) src[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  if (radius <= 0) {
    const out0 = new Uint8ClampedArray(data.length);
    for (let i = 0; i < N; i++) out0[i * 4 + 3] = src[i] ? 255 : 0;
    return { data: out0, width, height };
  }
  const tmp = new Uint8Array(N); // pasada horizontal
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let dx = -radius; dx <= radius && !on; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < width && src[y * width + xx]) on = 1;
      }
      tmp[y * width + x] = on;
    }
  }
  const out = new Uint8ClampedArray(data.length); // pasada vertical
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let dy = -radius; dy <= radius && !on; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < height && tmp[yy * width + x]) on = 1;
      }
      out[(y * width + x) * 4 + 3] = on ? 255 : 0;
    }
  }
  return { data: out, width, height };
}

// Line-art: aísla las líneas internas (pliegues encerrados, claros) + el contorno
// (píxeles de la masa adyacentes al fondo). El fondo se detecta por flood-fill desde
// los bordes sobre los píxeles NO-macizos.
export function maskBrainLineArt(imageData, lumThreshold = 128) {
  const { data, width, height } = imageData;
  const N = width * height;
  const solid = new Uint8Array(N); // oscuro y opaco = masa del cerebro
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3];
    const lum = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    solid[i] = (a > 128 && lum < lumThreshold) ? 1 : 0;
  }
  const bg = new Uint8Array(N);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (!solid[i] && !bg[i]) { bg[i] = 1; stack.push(i); }
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
  while (stack.length) {
    const i = stack.pop(); const x = i % width, y = (i / width) | 0;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < N; i++) {
    const x = i % width, y = (i / width) | 0;
    let keep = 0;
    if (!solid[i] && !bg[i]) {
      keep = 1; // claro encerrado = línea interna (pliegue)
    } else if (solid[i]) {
      const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (bg[ny * width + nx]) { keep = 1; break; } // masa adyacente al fondo = contorno
      }
    }
    out[i * 4 + 3] = keep ? 255 : 0;
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

export async function sampleShape(imagePath, count, maskFn = maskDarkOpaque) {
  const img = await loadImage(imagePath);
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  // encajar preservando aspecto, centrado
  const scale = Math.min(S / img.width, S / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
  return sampleCanvasPixels(maskFn(ctx.getImageData(0, 0, S, S)), count);
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
    this.pair = [PALETTE.naranja, PALETTE.azul]; // par de impulso por defecto
    this.paletteMix = 0;                          // 0=color, 1=color ancla
    this.anclaColor = PALETTE.lila; // color del momento ancla (secundario)
    this.pointSize = 2;        // tamaño base del punto (px), escalado por perspectiva
    this.bgColor = '#ffffff';  // fondo actual: estelas conscientes del fondo
    this.trails = false;
    this._frames = 0; this._fpsT = performance.now(); this.onFps = null;
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
    this._frames++;
    if (now - this._fpsT >= 500) {
      const fps = Math.round((this._frames * 1000) / (now - this._fpsT));
      this._frames = 0; this._fpsT = now;
      if (this.onFps) this.onFps(fps);
    }
    requestAnimationFrame(this._frame.bind(this));
  }

  _clear() {
    const ctx = this.ctx, w = window.innerWidth, h = window.innerHeight;
    if (this.trails) {
      const { r, g, b } = hexToRgb(this.bgColor);
      ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  }

  setTrails(on) {
    this.trails = on;
    if (!on) this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); // limpiar del todo al salir
  }

  // Reduced-motion: sin auto-rotación y las formas van directo a su estado final.
  setReducedMotion(on) {
    this.reducedMotion = on;
    if (on) { this._animating = false; this._progress = 1; morphStep(this.particles, 1); }
  }

  // Cambiar la cantidad recrea el array y re-siembra la forma actual.
  setCount(n) {
    this.count = n;
    this.particles = createParticles(n);
    for (const name of Object.keys(this._shapes)) {
      // re-muestrear cada forma al nuevo count (se hace en un cambio de cantidad, no en el loop)
      if (name === 'punto') this._shapes[name] = shapePunto(n);
      else if (name === 'circulo') this._shapes[name] = shapeCirculo(n);
      else if (name === 'cinco') this._shapes[name] = shapeCinco(n);
      else if (name === 'cerebro') this._shapes[name] = placeholderBrainPoints(n);
    }
    this._seedShape(this._shapes[this._shapeName] || this._shapes.circulo);
  }

  _render() {
    const ctx = this.ctx;
    const w = window.innerWidth, h = window.innerHeight;
    this._clear();
    const cx = w / 2, cy = h / 2, size = Math.min(w, h) * 0.42;
    const colorA = duotoneColor(0, this.paletteMix, this.pair[0], this.pair[1], this.anclaColor);   // seed<0.5
    const colorB = duotoneColor(0.9, this.paletteMix, this.pair[0], this.pair[1], this.anclaColor); // seed>=0.5
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? colorA : colorB;
      for (let i = 0; i < this.count; i++) {
        const p = this.particles[i];
        if ((p.seed < 0.5 ? 0 : 1) !== pass) continue;
        const rp = rotateY(p, this.rotation);
        const { sx, sy, scale } = project(rp, { fov: this.fov, depth: this.depth, size, cx, cy });
        const s = Math.max(1, Math.round(this.pointSize * scale));
        ctx.fillRect(sx, sy, s, s);
      }
    }
  }
}
