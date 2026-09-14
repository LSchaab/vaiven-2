# VAIVÉN Landing — Milestone 2 (Sistema de partículas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el sistema de partículas del SPEC §3 (canvas 2D, 4000 partículas, `sampleShape`/`morphTo`, formas cerebro/punto/cinco/círculo, proyección en perspectiva, estelas, color Palanca A, reduced-motion) aislado en `lab.html` — un banco de pruebas manejable con controles, que **no se deploya** y no toca la home.

**Architecture:** Un módulo `particles.js` con dos capas separadas: (1) funciones **puras** (matemática de formas, interpolación, proyección, color) sin ninguna dependencia del navegador, testeadas con el runner nativo de Node; (2) una clase `ParticleSystem` (browser: canvas, `requestAnimationFrame`, `getImageData`) que las orquesta. `lab.html` es un banco de pruebas con controles (botones de forma, sliders de progreso/paleta/cantidad, toggles de rotación/estelas/reduced-motion) para tunear el sistema a ojo. El scroll (M3) reemplazará después esos controles manuales por ScrollTrigger.

**Tech Stack:** JavaScript ES modules vanilla, canvas 2D. Sin librerías de runtime (GSAP entra en M3; WebGL queda como upgrade futuro evaluable). Tests con `node --test` (runner nativo, cero dependencias, solo dev). Sin build step.

## Global Constraints

Copiadas verbatim del SPEC §3/§6 y del design doc §7. Aplican a **todas** las tareas:

- **Canvas 2D, no WebGL/Three.js en este milestone.** (WebGL es un upgrade futuro, solo con justificación + pedido de asset explícito — design doc §7.2/§7.3. En M2 no se usa.)
- **Un solo sistema de partículas.** No programar efectos separados por bloque: todo momento es una llamada a `morphTo(shapeName, progress)`. (SPEC §0.3, §3.)
- **4000 partículas de arranque**, ajustable por performance. Modelo de cada partícula exactamente: `{ x, y, z, tx, ty, tz, ox, oy, oz, seed }`. (SPEC §3.)
- **Render con `fillRect` de 1–2px, nunca `arc()`.** Con 4000 partículas la diferencia de performance es enorme. (SPEC §3.)
- **Las formas se precalculan una sola vez** al cargar y se guardan. Nunca re-muestrear durante la animación. (SPEC §3.)
- **`sampleShape`**: dibuja el PNG en un canvas oculto, `getImageData`, recorre píxeles con **alpha > 128**, elige `count` posiciones al azar, normaliza a un espacio **-1 a 1**, y asigna `z` aleatorio en banda fina **-0.15 a 0.15** para que la forma tenga espesor y la rotación se lea. (SPEC §3.)
- **Estelas**: en vez de `clearRect`, pintar `rgba(255,255,255,0.08)` encima; dejan rastro. Modo activable/desactivable (en la home será solo bloques 4–5). (SPEC §3.)
- **`prefers-reduced-motion` desde el inicio**: el canvas renderiza la **forma final sin morphear** y sin auto-rotación. Patrón implementado desde el arranque del sistema. (SPEC §6.)
- **Palanca A (color)**: las partículas nacen **en color** (duotono con pares complementarios) y un parámetro de paleta las **desatura a gris** (momento ancla). El azul canónico es **`#2222a0`** (NO `#3A39FF`), y los pares son **naranja `#FF5B23` / azul `#2222a0`** y **violeta `#511F99` / amarillo `#FFCC00`**, nunca mezclando pares. (design doc §4, §7.5.)
- **`lab.html` NO se deploya** (SPEC §8) y no modifica `index.html`, `home.css` ni `data.js`. Corre con un **server local** (usa ES modules, `file://` no alcanza).
- **`particles.js` no debe tocar globals del navegador en el top-level del módulo** (para que Node pueda importarlo y testear las funciones puras). Todo acceso a `document`/`window`/`matchMedia`/`requestAnimationFrame` vive dentro de métodos, no en la carga del módulo.
- **`package.json`** existe solo como marcador `{"type":"module"}` para que Node corra los tests y trate los `.js` como ES modules. **No es un build step, no instala nada, no tiene dependencias**, y GitHub Pages lo ignora.

---

## File Structure

Archivos de este milestone (subconjunto del §8 del SPEC; `scroll.js` es M3):

- `particles.js` — **crear**. El sistema completo del §3: funciones puras exportadas + la clase `ParticleSystem`. Única fuente del sistema de partículas.
- `lab.html` — **crear**. Banco de pruebas: canvas fullscreen + panel de controles + bootstrap que instancia `ParticleSystem`. No se deploya.
- `tests/particles.test.mjs` — **crear**. Tests con `node --test` de las funciones puras de `particles.js`.
- `package.json` — **crear**. Solo `{"type":"module","private":true}` (marcador ESM para Node; ver Global Constraints).

Responsabilidades: `particles.js` es toda la lógica (pura + browser); `lab.html` es solo cableado de UI y no contiene lógica de partículas; `tests/` verifica la matemática pura; `package.json` es un marcador, sin contenido de proyecto.

No se tocan `index.html`, `home.css`, `data.js` ni el deploy.

---

### Task 1: Marcador ESM, harness de tests y funciones puras base (lerp, easing, rotación, proyección)

**Files:**
- Create: `package.json`, `particles.js`, `tests/particles.test.mjs`, `lab.html`

**Interfaces:**
- Consumes: nada (primer task de M2).
- Produces: `lerp(a,b,t)→number`, `easeInOutCubic(t)→number`, `rotateY(p,angle)→{x,y,z}`, `project(p,{fov,depth,size,cx,cy})→{sx,sy,scale}`, `PARTICLE_COUNT=4000`. Todas puras, importables en Node. `lab.html` shell con canvas fullscreen.

- [ ] **Step 1: Crear el marcador ESM**

`package.json`:
```json
{
  "type": "module",
  "private": true
}
```

- [ ] **Step 2: Escribir los tests que fallan** (`tests/particles.test.mjs`)

```js
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
```

- [ ] **Step 3: Correr los tests y verificar que fallan**

Run: `node --test tests/particles.test.mjs`
Expected: FALLA — `particles.js` no existe / no exporta esas funciones (`ERR_MODULE_NOT_FOUND` o `SyntaxError: does not provide an export`).

- [ ] **Step 4: Escribir la implementación mínima** (`particles.js`)

```js
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
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `node --test tests/particles.test.mjs`
Expected: PASA — 5/5 tests, salida limpia (`# pass 5`, `# fail 0`).

- [ ] **Step 6: Crear el shell de `lab.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VAIVÉN — lab de partículas</title>
  <style>
    html, body { margin: 0; height: 100%; background: #fff; overflow: hidden;
      font-family: system-ui, sans-serif; }
    #stage { position: fixed; inset: 0; z-index: 0; }
    #panel { position: fixed; top: 12px; left: 12px; z-index: 10;
      background: rgba(255,255,255,0.9); border: 1px solid #000; border-radius: 8px;
      padding: 10px 12px; font-size: 13px; display: grid; gap: 8px; max-width: 240px; }
    #panel button { cursor: pointer; }
    #panel .row { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
    #readout { font-variant-numeric: tabular-nums; opacity: .7; }
  </style>
</head>
<body>
  <canvas id="stage"></canvas>
  <div id="panel">
    <strong>lab de partículas</strong>
    <div id="controls"><!-- los controles se agregan en tasks siguientes --></div>
    <div id="readout">—</div>
  </div>
  <script type="module">
    // El bootstrap real (instanciar ParticleSystem, cablear controles) se completa
    // en los tasks siguientes. Por ahora solo confirmamos que el módulo carga.
    import { PARTICLE_COUNT } from './particles.js';
    document.getElementById('readout').textContent = `listo · N=${PARTICLE_COUNT}`;
  </script>
</body>
</html>
```

- [ ] **Step 7: Verificar que `lab.html` carga con server local**

Levantar un server estático desde la raíz del repo y abrir el lab en Chrome:
```bash
python -m http.server 8000
```
```powershell
Start-Process chrome "http://localhost:8000/lab.html"
```
Expected: el panel muestra `listo · N=4000` (el módulo cargó por HTTP; `file://` no funcionaría). Canvas en blanco por ahora.

- [ ] **Step 8: Commit**

```bash
git add package.json particles.js tests/particles.test.mjs lab.html
git commit -m "feat(m2): harness de tests + funciones puras base (lerp, ease, rotateY, project) + shell de lab.html"
```

---

### Task 2: Modelo de partícula, formas puras (punto/círculo/cinco), muestreo de píxeles e interpolación

**Files:**
- Modify: `particles.js`, `tests/particles.test.mjs`

**Interfaces:**
- Consumes: `lerp`, `easeInOutCubic` (Task 1).
- Produces: `createParticles(count, rng?)→Particle[]`; `shapePunto(count,rng?)`, `shapeCirculo(count,rng?)`, `shapeCinco(count,rng?)`, `sampleCanvasPixels(imageData,count,rng?)` — todas devuelven `{x,y,z}[]` de largo `count`, normalizadas a [-1,1]; `setTargets(particles, points)→void`; `morphStep(particles, progress, ease?)→void`. Todas puras.

- [ ] **Step 1: Escribir los tests que fallan** (agregar a `tests/particles.test.mjs`)

```js
import {
  createParticles, shapePunto, shapeCirculo, shapeCinco,
  sampleCanvasPixels, setTargets, morphStep,
} from '../particles.js';

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
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `node --test tests/particles.test.mjs`
Expected: FALLA — las nuevas funciones no existen todavía.

- [ ] **Step 3: Implementar el modelo, las formas, el muestreo y el morph** (agregar a `particles.js`)

```js
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
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `node --test tests/particles.test.mjs`
Expected: PASA — todos los tests (los de Task 1 + los 6 nuevos), salida limpia.

- [ ] **Step 5: Commit**

```bash
git add particles.js tests/particles.test.mjs
git commit -m "feat(m2): modelo de particula, formas puras (punto/circulo/cinco), sampleCanvasPixels y morph"
```

---

### Task 3: `ParticleSystem` — canvas, loop de render, rotación y proyección (browser)

**Files:**
- Modify: `particles.js`, `lab.html`

**Interfaces:**
- Consumes: `createParticles`, `shapeCirculo`, `rotateY`, `project`, `PARTICLE_COUNT`.
- Produces: `class ParticleSystem`, construida con `new ParticleSystem(canvas, { count })`; métodos `.start()`, `.stop()`; propiedades `rotationSpeed` (rad/s), `reducedMotion` (bool). Al arrancar, siembra las partículas en la forma `circulo` y las dibuja rotando con `fillRect`.

- [ ] **Step 1: Implementar la clase con el loop de render** (agregar a `particles.js`)

```js
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
```

- [ ] **Step 2: Instanciar el sistema en `lab.html`** (reemplazar el `<script type="module">` del shell)

```html
  <script type="module">
    import { ParticleSystem } from './particles.js';
    const canvas = document.getElementById('stage');
    const system = new ParticleSystem(canvas);
    window.__system = system; // handle para debug en consola
    system.start();
    document.getElementById('readout').textContent =
      `N=${system.count} · reduced-motion=${system.reducedMotion}`;
  </script>
```

- [ ] **Step 3: Verificar el render en el navegador**

Con el server local corriendo, abrir `http://localhost:8000/lab.html` en Chrome.
Expected: se ve un **disco de ~4000 puntitos negros rotando** lentamente sobre el eje Y (se lee la profundidad: los puntos del frente un toque más grandes). El panel muestra `N=4000 · reduced-motion=false`. En Console: `__system.rotationSpeed = 0` frena la rotación; `__system.stop()` corta el loop.

- [ ] **Step 4: Verificar que Node sigue pudiendo importar el módulo**

Run: `node --test tests/particles.test.mjs`
Expected: PASA — agregar la clase (que usa `window`/`document` dentro de métodos) no rompe la importación en Node, porque nada de eso corre en el top-level.

- [ ] **Step 5: Commit**

```bash
git add particles.js lab.html
git commit -m "feat(m2): ParticleSystem con loop de render, rotacion eje Y y proyeccion (fillRect)"
```

---

### Task 4: Formas cableadas, `morphTo`, `sampleShape` + cerebro placeholder, y controles del lab

**Files:**
- Modify: `particles.js`, `lab.html`

**Interfaces:**
- Consumes: `shapePunto`, `shapeCirculo`, `shapeCinco`, `sampleCanvasPixels`, `setTargets`, `morphStep`, `ParticleSystem` (Tasks 2–3).
- Produces: en `particles.js` — `sampleShape(imagePath, count)→Promise<{x,y,z}[]>` (browser) y `placeholderBrainPoints(count)→{x,y,z}[]` (browser); en `ParticleSystem` — `registerShape(name, points)`, `morphTo(shapeName, progress)`, `setProgressManual(v)`, con animación interna de progreso. En `lab.html` — botones de forma + slider de progreso + toggle de rotación.

- [ ] **Step 1: Agregar el muestreo de imagen y el cerebro placeholder** (agregar a `particles.js`)

```js
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
  return sampleCanvasPixels(ctx.getImageData(0, 0, S, S), count);
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
```

- [ ] **Step 2: Agregar formas y `morphTo` a `ParticleSystem`** (agregar dentro de la clase, y ajustar el constructor)

Al final del `constructor`, después de `_seedShape(...)`, agregar el registro de formas y el estado de morph:
```js
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
```

Agregar métodos a la clase:
```js
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
```

Modificar `_frame` para avanzar la animación de morph (insertar antes de `this._render()`):
```js
    if (this._animating) {
      this._progress = Math.min(1, (now - this._morphStart) / 1000 / this.morphDuration);
      morphStep(this.particles, this._progress);
      if (this._progress >= 1) this._animating = false;
    }
```

- [ ] **Step 3: Cablear los controles en `lab.html`** (reemplazar el contenido de `#controls` y ampliar el `<script>`)

Dentro de `<div id="controls">`:
```html
      <div class="row">
        <button data-shape="punto">Punto</button>
        <button data-shape="circulo">Círculo</button>
        <button data-shape="cinco">Cinco</button>
        <button data-shape="cerebro">Cerebro</button>
      </div>
      <label class="row">progreso
        <input id="progress" type="range" min="0" max="1" step="0.01" value="1">
      </label>
      <label class="row">rotación
        <input id="rot" type="checkbox" checked>
      </label>
```

Ampliar el `<script type="module">` (después de `system.start();`):
```js
    for (const btn of document.querySelectorAll('[data-shape]')) {
      btn.addEventListener('click', () => system.morphTo(btn.dataset.shape));
    }
    const progress = document.getElementById('progress');
    progress.addEventListener('input', () => system.setProgressManual(parseFloat(progress.value)));
    const rot = document.getElementById('rot');
    rot.addEventListener('change', () => { system.rotationSpeed = rot.checked ? 0.3 : 0; });
```

- [ ] **Step 4: (opcional, solo si ya está el PNG real) inyectar el cerebro real**

Si existe `resources/cerebro.png`, agregar después del cableado de botones:
```js
    sampleShape('resources/cerebro.png', system.count)
      .then((pts) => system.registerShape('cerebro', pts))
      .catch(() => { /* sin PNG real: queda el placeholder */ });
```
Si el asset todavía no está, **no** agregar esta llamada (el botón "Cerebro" usa el placeholder). Anotarlo en el reporte.

- [ ] **Step 5: Verificar morphing y formas en el navegador**

Abrir `http://localhost:8000/lab.html`. Expected:
- Clic en **Punto** → las partículas colapsan a un puntito (radio chico) con animación suave (~1.2s).
- Clic en **Cinco** → se separan en 5 cúmulos.
- Clic en **Cerebro** → forman la silueta placeholder (masa central + lóbulos), reconocible y rotando.
- Clic en **Círculo** → disco lleno.
- El **slider de progreso**: llevándolo a 0 vuelve al origen del último morph, a 1 al objetivo (scrub manual).
- El **toggle de rotación** frena/reanuda el giro.

- [ ] **Step 6: Verificar que los tests puros siguen pasando**

Run: `node --test tests/particles.test.mjs`
Expected: PASA (Task 4 no cambió funciones puras testeadas; confirmamos que no se rompió la importación).

- [ ] **Step 7: Commit**

```bash
git add particles.js lab.html
git commit -m "feat(m2): morphTo + formas cableadas + sampleShape/cerebro placeholder + controles del lab"
```

---

### Task 5: Palanca A — color duotono con desaturación a gris

**Files:**
- Modify: `particles.js`, `tests/particles.test.mjs`, `lab.html`

**Interfaces:**
- Consumes: `lerp` (Task 1), `ParticleSystem._render` (Tasks 3–4).
- Produces: `PALETTE` (objeto con los hex canónicos), `duotoneColor(seed, mix, hexA, hexB)→string` (pura, testeada); en `ParticleSystem` — propiedades `paletteMix` (0=impulso/color, 1=ancla/gris) y `pair` (`[hexA, hexB]`), con render en **dos pasadas** (una por color, 2 `fillStyle` por frame). En `lab.html` — slider de paleta + selector de par.

- [ ] **Step 1: Escribir los tests que fallan** (agregar a `tests/particles.test.mjs`)

```js
import { PALETTE, duotoneColor } from '../particles.js';

test('PALETTE tiene los hex canonicos (azul #2222a0, NO #3A39FF)', () => {
  assert.equal(PALETTE.azul.toLowerCase(), '#2222a0');
  assert.equal(PALETTE.naranja.toUpperCase(), '#FF5B23');
  assert.equal(PALETTE.violeta.toUpperCase(), '#511F99');
  assert.equal(PALETTE.amarillo.toUpperCase(), '#FFCC00');
});

test('duotoneColor: mix=0 devuelve el color del par segun el seed', () => {
  // seed < 0.5 → hexA ; seed >= 0.5 → hexB
  assert.equal(duotoneColor(0.1, 0, PALETTE.naranja, PALETTE.azul), 'rgb(255,91,35)');   // #FF5B23
  assert.equal(duotoneColor(0.9, 0, PALETTE.naranja, PALETTE.azul), 'rgb(34,34,160)');    // #2222a0
});

test('duotoneColor: mix=1 desatura a gris (ancla), sin importar seed', () => {
  assert.equal(duotoneColor(0.1, 1, PALETTE.naranja, PALETTE.azul), 'rgb(128,128,128)');
  assert.equal(duotoneColor(0.9, 1, PALETTE.naranja, PALETTE.azul), 'rgb(128,128,128)');
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `node --test tests/particles.test.mjs`
Expected: FALLA — `PALETTE`/`duotoneColor` no existen.

- [ ] **Step 3: Implementar la paleta y el color** (agregar a `particles.js`, en la capa pura)

```js
// Paleta canónica (espeja los tokens de home.css). Azul = #2222a0 (design doc §7.5).
export const PALETTE = {
  naranja: '#FF5B23', azul: '#2222a0',
  violeta: '#511F99', amarillo: '#FFCC00',
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

// seed elige el extremo del duotono; mix 0=color (impulso), 1=gris (ancla).
export function duotoneColor(seed, mix, hexA, hexB) {
  const base = seed < 0.5 ? hexToRgb(hexA) : hexToRgb(hexB);
  const GRAY = 128;
  const r = Math.round(lerp(base.r, GRAY, mix));
  const g = Math.round(lerp(base.g, GRAY, mix));
  const b = Math.round(lerp(base.b, GRAY, mix));
  return `rgb(${r},${g},${b})`;
}
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `node --test tests/particles.test.mjs`
Expected: PASA — incluidos los 3 nuevos tests de color.

- [ ] **Step 5: Aplicar el color en el render, en dos pasadas** (modificar `ParticleSystem`)

En el `constructor`, después de `this.morphDuration = 1.2;`, agregar:
```js
    this.pair = [PALETTE.naranja, PALETTE.azul]; // par de impulso por defecto
    this.paletteMix = 0;                          // 0=color, 1=gris
```

Reemplazar `_render()` por la versión en dos pasadas (como `duotoneColor` solo depende de `seed<0.5` + `mix` + `pair`, hay exactamente **2 colores por frame** → 2 `fillStyle`, barato):
```js
  _render() {
    const ctx = this.ctx;
    const w = window.innerWidth, h = window.innerHeight;
    this._clear();
    const cx = w / 2, cy = h / 2, size = Math.min(w, h) * 0.42;
    const colorA = duotoneColor(0, this.paletteMix, this.pair[0], this.pair[1]);   // seed<0.5
    const colorB = duotoneColor(0.9, this.paletteMix, this.pair[0], this.pair[1]); // seed>=0.5
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? colorA : colorB;
      for (let i = 0; i < this.count; i++) {
        const p = this.particles[i];
        if ((p.seed < 0.5 ? 0 : 1) !== pass) continue;
        const rp = rotateY(p, this.rotation);
        const { sx, sy, scale } = project(rp, { fov: this.fov, depth: this.depth, size, cx, cy });
        const s = scale > 1 ? 2 : 1;
        ctx.fillRect(sx, sy, s, s);
      }
    }
  }
```

- [ ] **Step 6: Cablear los controles de paleta en `lab.html`** (agregar dentro de `#controls`)

```html
      <label class="row">paleta impulso→ancla
        <input id="mix" type="range" min="0" max="1" step="0.01" value="0">
      </label>
      <label class="row">par
        <select id="pair">
          <option value="naranja-azul">naranja / azul</option>
          <option value="violeta-amarillo">violeta / amarillo</option>
        </select>
      </label>
```

Ampliar el `<script type="module">`:
```js
    import { PALETTE as PAL } from './particles.js'; // (ya importado arriba; reusar si aplica)
    const mix = document.getElementById('mix');
    mix.addEventListener('input', () => { system.paletteMix = parseFloat(mix.value); });
    const pairSel = document.getElementById('pair');
    pairSel.addEventListener('change', () => {
      system.pair = pairSel.value === 'violeta-amarillo'
        ? [PAL.violeta, PAL.amarillo] : [PAL.naranja, PAL.azul];
    });
```
Nota: importar `PALETTE` una sola vez arriba en el mismo `import` de `particles.js` (no duplicar el `import`). Ej: `import { ParticleSystem, PALETTE as PAL } from './particles.js';`.

- [ ] **Step 7: Verificar el color en el navegador**

Abrir el lab. Expected:
- Las partículas se ven **en color** (mitad naranja, mitad azul `#2222a0`), no negras.
- El slider **paleta impulso→ancla** en 1 las lleva a **gris**; en 0 vuelven al duotono.
- El selector **par** cambia a violeta/amarillo.
- La rotación y el morphing siguen funcionando con color.

- [ ] **Step 8: Commit**

```bash
git add particles.js tests/particles.test.mjs lab.html
git commit -m "feat(m2): Palanca A - color duotono con desaturacion a gris (azul #2222a0), render en dos pasadas"
```

---

### Task 6: Estelas, `prefers-reduced-motion` y controles de performance

**Files:**
- Modify: `particles.js`, `lab.html`

**Interfaces:**
- Consumes: `ParticleSystem` (Tasks 3–5).
- Produces: en `ParticleSystem` — `setTrails(bool)`, `setCount(n)`, `setReducedMotion(bool)`, y un readout de FPS vía callback `onFps`. En `lab.html` — toggle de estelas, slider de cantidad, checkbox "simular reduced-motion", y FPS en el readout.

- [ ] **Step 1: Implementar estelas, reduced-motion y recount** (modificar `ParticleSystem`)

En el `constructor`, después de `this.paletteMix = 0;`, agregar:
```js
    this.trails = false;
    this._frames = 0; this._fpsT = performance.now(); this.onFps = null;
```

Reemplazar `_clear()` para soportar estelas (SPEC §3: en vez de limpiar, pintar blanco semitransparente):
```js
  _clear() {
    const ctx = this.ctx, w = window.innerWidth, h = window.innerHeight;
    if (this.trails) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, w, h); }
    else ctx.clearRect(0, 0, w, h);
  }
```

Agregar métodos:
```js
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
```
Nota: `setCount` vuelve a muestrear las formas base y el cerebro placeholder. Si se inyectó un cerebro real vía `registerShape`, se pierde al recontar en el lab — es aceptable para el banco de pruebas (se puede re-inyectar). Anotarlo.

Agregar el conteo de FPS en `_frame` (después de `this._render();`):
```js
    this._frames++;
    if (now - this._fpsT >= 500) {
      const fps = Math.round((this._frames * 1000) / (now - this._fpsT));
      this._frames = 0; this._fpsT = now;
      if (this.onFps) this.onFps(fps);
    }
```

En reduced-motion, `_frame` no debe rotar ni animar (ya cubierto: `if (!this.reducedMotion) this.rotation += ...` y `_animating` se apaga). Confirmar que sigue así.

- [ ] **Step 2: Cablear los controles de perf en `lab.html`** (agregar dentro de `#controls`)

```html
      <label class="row">estelas
        <input id="trails" type="checkbox">
      </label>
      <label class="row">cantidad <span id="countVal">4000</span>
        <input id="count" type="range" min="1000" max="8000" step="500" value="4000">
      </label>
      <label class="row">simular reduced-motion
        <input id="rm" type="checkbox">
      </label>
```

Ampliar el `<script type="module">`:
```js
    const trails = document.getElementById('trails');
    trails.addEventListener('change', () => system.setTrails(trails.checked));
    const count = document.getElementById('count');
    const countVal = document.getElementById('countVal');
    count.addEventListener('input', () => {
      countVal.textContent = count.value;
      system.setCount(parseInt(count.value, 10));
    });
    const rm = document.getElementById('rm');
    rm.addEventListener('change', () => system.setReducedMotion(rm.checked));
    system.onFps = (fps) => {
      document.getElementById('readout').textContent =
        `N=${system.count} · ${fps} fps · reduced-motion=${system.reducedMotion}`;
    };
```

- [ ] **Step 3: Verificar estelas, reduced-motion y perf en el navegador**

Abrir el lab. Expected:
- **Estelas** ON: los puntos dejan rastro (el fondo no se limpia del todo, se va desvaneciendo); OFF: se limpia y vuelve a puntos nítidos.
- **Cantidad**: mover el slider cambia la densidad; el readout muestra el nuevo N y los FPS.
- **Simular reduced-motion** ON: se corta la rotación y, al clickear una forma, **salta** a la forma final sin animar. OFF: vuelve a animar.
- **FPS**: con 4000 partículas, el readout debe mostrar ~60 fps en una notebook común. Si baja mucho, anotarlo (el presupuesto del SPEC §6 es bajar el conteo antes que sacar momentos).

- [ ] **Step 4: Verificar que los tests puros siguen pasando**

Run: `node --test tests/particles.test.mjs`
Expected: PASA (Task 6 no tocó funciones puras).

- [ ] **Step 5: Commit**

```bash
git add particles.js lab.html
git commit -m "feat(m2): estelas, prefers-reduced-motion (forma final estatica) y controles de cantidad/fps"
```

---

### Task 7: Revisión de milestone (gate humano, local)

**Files:** ninguno (verificación).

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: banco de pruebas verificado + checklist para Lourdes; OK explícito antes del Milestone 3.

- [ ] **Step 1: Correr toda la suite de tests**

Run: `node --test tests/particles.test.mjs`
Expected: PASA todo, salida limpia (sin warnings).

- [ ] **Step 2: Levantar el server y abrir el lab en Chrome**

```bash
python -m http.server 8000
```
```powershell
Start-Process chrome "http://localhost:8000/lab.html"
```
(`lab.html` **no** se deploya; se revisa local.)

- [ ] **Step 3: Correr el checklist y presentárselo a Lourdes**

Checklist de qué mirar:
- [ ] Arranca un disco de ~4000 puntos **en color** (naranja/azul `#2222a0`) rotando suave.
- [ ] Los botones **Punto / Círculo / Cinco / Cerebro** transicionan con morph suave; el cerebro se lee como silueta (placeholder).
- [ ] El **slider de progreso** scrubbea el morph a mano (0=origen, 1=destino).
- [ ] El **slider de paleta** desatura de color a **gris** (impulso→ancla).
- [ ] El **selector de par** cambia a violeta/amarillo.
- [ ] **Estelas** deja rastro y se limpia al apagarlas.
- [ ] **Simular reduced-motion** corta rotación y salta a la forma final sin animar.
- [ ] Con 4000 partículas el **FPS** se sostiene (~60 en notebook común).
- [ ] Nada de esto tocó la home en vivo (`vaiven.lourdesschaab.com` sigue igual).

- [ ] **Step 4: Recordatorio de assets pendientes.** El **cerebro es placeholder**: cuando Lourdes deje `resources/cerebro.png` (silueta rellena, fondo transparente, perfil, ~1000–1500px), se cambia con `sampleShape('resources/cerebro.png', count)` (Task 4 Step 4) — una línea. El **ID del demoreel** se necesita en M3.

- [ ] **Step 5: Esperar OK de Lourdes.** No arrancar el Milestone 3 (cablear scroll) sin aprobación.

---

## Roadmap — Milestones 3 a 6 (planes propios al llegar)

Sin cambios respecto al Milestone 1. Recordatorio de dónde caen las palancas y los assets pendientes:

- **Milestone 3 — Cablear scroll** (`scroll.js`): GSAP + ScrollTrigger por CDN, canvas pinneado bloques 1–7, un ScrollTrigger `scrub` por bloque mapeando su progreso a `morphTo`/rotación/paleta, y **Palanca C** (easing por bloque). Lightbox de YouTube reutilizable (**requiere ID del demoreel**). Los controles manuales del lab se traducen a scroll.
- **Milestone 4 — Portfolio horizontal**: carrusel único ordenado por `data.js`, scroll secuestrado, hover de aberración cromática (versión barata con pseudo-elementos primero).
- **Milestone 5 — Color, texturas y hover**: filtro `#papercut` (feTurbulence + feDisplacementMap), **Palanca D** (grano global), duotonos. **Palanca B** (motivo de orden/blueprint) como *stretch*.
- **Milestone 6 — Fallbacks**: `prefers-reduced-motion` end-to-end en la home, mobile <768px (bloques apilados, canvas estático por bloque), presupuesto 60fps.
- **Assets pendientes**: PNG real del cerebro (M2 lo usa apenas llegue), ID de YouTube del demoreel (M3), ícono del ojo (M3), inventario del portfolio (M4).
- **Evaluación futura**: si el equipo 3D entrega un modelo del cerebro, evaluar upgrade a WebGL (design doc §7.3).

---

## Self-Review

**Spec coverage (SPEC §3 y §6):**
- Canvas 2D único, `position: fixed` detrás del contenido → Task 1 (shell) + Task 3 (`#stage`, canvas fullscreen). ✓
- Modelo de partícula `{x,y,z,tx,ty,tz,ox,oy,oz,seed}` → Task 2 (`createParticles`). ✓
- `sampleShape` (canvas oculto, `getImageData`, alpha>128, normaliza -1..1, z en -0.15..0.15) → Task 2 (`sampleCanvasPixels`, núcleo puro) + Task 4 (`sampleShape` browser). ✓
- Formas cerebro/punto/cinco/circulo → Task 2 (punto/circulo/cinco) + Task 4 (cerebro placeholder + real vía `registerShape`). ✓
- Precalcular formas una vez → Task 4 (`this._shapes` en el constructor); recount explícito en Task 6 (`setCount`, fuera del loop). ✓
- Proyección en perspectiva + rotación eje Y + `fillRect` 1–2px → Task 1 (`project`) + Task 3 (`_render`, `rotateY`). ✓
- `morphTo(shapeName, progress)` único → Task 4 (`morphTo` + `setProgressManual`); interpolación pura en Task 2 (`morphStep`). ✓
- Estelas (`rgba(255,255,255,0.08)`, activable) → Task 6 (`setTrails`/`_clear`). ✓
- `prefers-reduced-motion` desde el inicio → Task 3 (flag en el constructor, sin rotación) + Task 6 (`setReducedMotion`, salto a forma final). ✓
- Palanca A (color duotono, desaturación a gris, azul `#2222a0`) → Task 5. ✓
- `lab.html` como banco de pruebas, no deployado → Tasks 1/3/4/5/6 (controles), Task 7 (gate local). ✓
- Presupuesto 60fps / bajar conteo → Task 6 (FPS + slider de cantidad). ✓

**Placeholder scan:** el "cerebro placeholder" es una decisión aprobada (design doc §7.4), no un placeholder del plan: es código real (`placeholderBrainPoints`) con reemplazo de una línea documentado (Task 4 Step 4). Todos los steps tienen código real, comandos reales y verificación concreta (Node para lo puro, navegador para lo visual). No hay "TODO"/"implementar después" sin contenido.

**Type consistency:** nombres consistentes entre tasks — `sampleCanvasPixels(imageData,count,rng)` (Task 2) lo usan `sampleShape` y `placeholderBrainPoints` (Task 4); `setTargets`/`morphStep` (Task 2) los usa `ParticleSystem.morphTo`/`setProgressManual` (Task 4) y `setReducedMotion` (Task 6); `duotoneColor(seed,mix,hexA,hexB)` + `PALETTE` (Task 5) los usa `_render` (Task 5); `rotateY`/`project` (Task 1) los usa `_render` (Task 3). El campo de estado `_shapes`, `_shapeName`, `_progress`, `_animating`, `trails`, `paletteMix`, `pair`, `count` se define en el constructor (Tasks 3–6) y se usa consistentemente. `_render` se reescribe una vez (Task 5, dos pasadas) — versión final única, sin firmas divergentes.
