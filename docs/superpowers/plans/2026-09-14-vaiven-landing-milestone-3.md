# Milestone 3 — Cablear las partículas al scroll — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cablear el sistema de partículas de M2 al scroll de la home: canvas a pantalla completa detrás del contenido, un morph por bloque driveado por scroll (scrub), el punto que recorre la pantalla (el vaivén), y el lightbox del demoreel en el ícono del ojo.

**Architecture:** Enfoque A del design doc (`docs/superpowers/specs/2026-09-14-vaiven-m3-scroll.md`): canvas `position: fixed` (pinneado solo, sin `pin` de GSAP); un `ScrollTrigger` por sección con `scrub: 1` que mapea su progreso 0→1 a un morph + los efectos del bloque. `particles.js` sigue siendo el motor puro con tres agregados aditivos; `scroll.js` es la orquestación (browser-only); `lightbox.js` es el componente reutilizable del ojo. La lógica pura (easings, offset, URL de YouTube) se testea en Node; el pegamento de navegador se verifica por sintaxis (`node --check`) + checklist visual de Lourdes.

**Tech Stack:** HTML/CSS/JS vanilla (sin build step). GSAP 3.12.5 + ScrollTrigger por CDN (ESM vía `esm.sh`, autorizado en `CLAUDE.md`). Tests con `node --test` (Node v24).

## Global Constraints

- **Sin build step, sin frameworks ni bundlers.** Solo GSAP+ScrollTrigger como librería nueva, por CDN. (`CLAUDE.md`)
- **Todo agregado a `particles.js` es aditivo**: no rompe `lab.html` ni los tests de M2. Se respeta la separación en dos capas (funciones puras arriba, clase abajo; nada de `document`/`window` en el top-level del módulo). (design doc §5)
- **Piso no-negociable:** el esqueleto estático de M1 sigue legible **sin JS** (texto oscuro sobre fondo claro). El tema oscuro (texto claro sobre el campo negro del canvas) se activa **solo** cuando corre JS, vía la clase `scroll-on` en `<html>`. (design doc §1, §7)
- **Azul canónico `#2222a0`** (nunca `#3A39FF`). (design doc §7.5)
- **Defaults de partículas (fijados por Lourdes):** cerebro modo **líneas** (`maskBrainLineArt`), `pointSize` **2.5**, densidad **12000**, ancla lila **`#B4B4ED`**, fondo negro.
- **Demoreel YouTube ID: `RQfjTjdYvTQ`.**
- **Reduced-motion y mobile <768px:** mismo camino — sin scrub, forma final por bloque al entrar, sin estelas ni auto-rotación. (design doc §7)
- **No inventar contenido:** lo que falta va a `data.js` como `TODO` y no se renderiza. (`CLAUDE.md`)
- **Verificación visual:** la extensión de Chrome de Claude no está conectada → la hace Lourdes abriendo la home con un server estático de Node. Claude deja checklist por bloque. Gate humano al final del milestone.

---

### Task 1: Easings por bloque (`easeOutBack`, `easeInQuart`) + campo `this.ease`

Agrega dos easings puros (Palanca C — "fricción" por bloque) y hace que el morph use un ease configurable por bloque en vez del `easeInOutCubic` fijo.

**Files:**
- Modify: `particles.js` (nuevas exports puras junto a `easeInOutCubic:8`; campo y uso en la clase `ParticleSystem`)
- Test: `tests/particles.test.mjs`

**Interfaces:**
- Consumes: `lerp`, `easeInOutCubic`, `morphStep(particles, progress, ease)` (ya existen).
- Produces:
  - `export const easeOutBack = (t) => number` — overshoot (supera 1 antes de asentar), `f(0)=0`, `f(1)=1`.
  - `export const easeInQuart = (t) => number` — arranque lento, `f(0)=0`, `f(1)=1`.
  - `ParticleSystem` gana el campo público `this.ease` (default `easeInOutCubic`). `setProgressManual` y el paso animado de `_frame` pasan `this.ease` a `morphStep`.

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/particles.test.mjs`, agregar `easeOutBack, easeInQuart` al `import` de `../particles.js` y estos tests al final:

```js
test('easeInQuart: extremos fijos y arranque lento', () => {
  assert.equal(easeInQuart(0), 0);
  assert.equal(easeInQuart(1), 1);
  assert.ok(Math.abs(easeInQuart(0.5) - 0.0625) < 1e-9, 'f(0.5)=0.5^4');
  // monótona creciente
  for (let t = 0; t < 1; t += 0.1) assert.ok(easeInQuart(t + 0.05) >= easeInQuart(t));
});

test('easeOutBack: extremos fijos y overshoot > 1 antes de asentar', () => {
  assert.ok(Math.abs(easeOutBack(0)) < 1e-9, 'f(0)=0');
  assert.ok(Math.abs(easeOutBack(1) - 1) < 1e-9, 'f(1)=1');
  // en algún punto de (0,1) el back-ease pasa de 1 (rebote)
  let overshoots = false;
  for (let t = 0.5; t < 1; t += 0.02) if (easeOutBack(t) > 1) overshoots = true;
  assert.ok(overshoots, 'easeOutBack debe superar 1 en algún t de (0,1)');
});
```

- [ ] **Step 2: Correr los tests para verlos fallar**

Run: `node --test`
Expected: FAIL — `easeInQuart is not defined` / `easeOutBack is not defined`.

- [ ] **Step 3: Implementar los easings puros**

En `particles.js`, justo debajo de `easeInOutCubic` (línea 8-9):

```js
export const easeInQuart = (t) => t * t * t * t;

export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
```

- [ ] **Step 4: Agregar el campo `this.ease` y usarlo en la clase**

En el constructor de `ParticleSystem` (junto a los otros defaults, ~línea 307), agregar:

```js
    this.ease = easeInOutCubic; // easing del morph, seteable por bloque (Palanca C)
```

En `setProgressManual` (~línea 337-341), pasar el ease:

```js
  setProgressManual(v) {
    this._animating = false;
    this._progress = v;
    morphStep(this.particles, v, this.ease);
  }
```

En `_frame`, el paso animado (~línea 375-376), pasar el ease:

```js
      morphStep(this.particles, this._progress, this.ease);
```

- [ ] **Step 5: Correr los tests y verlos pasar**

Run: `node --test`
Expected: PASS (los nuevos + todos los de M2 siguen verdes).

- [ ] **Step 6: Commit**

```bash
git add particles.js tests/particles.test.mjs
git commit -m "feat(m3): easings por bloque (easeOutBack, easeInQuart) + campo this.ease"
```

---

### Task 2: `beginMorph(name)` — preparar el morph sin animar

Método que fija el objetivo y snapshotea el origen **sin** arrancar la animación por tiempo, para que el scroll maneje el número vía `setProgressManual`. (design doc §5.1)

**Files:**
- Modify: `particles.js` (método nuevo en `ParticleSystem`, cerca de `morphTo:322`)
- Test: `tests/particles.test.mjs`

**Interfaces:**
- Consumes: `setTargets(particles, points)`, `this._shapes`, `this.particles`.
- Produces: `ParticleSystem.prototype.beginMorph(name: string): void` — si `name` no existe en `_shapes`, no-op. Setea `ox/oy/oz` = posición actual, `tx/ty/tz` = forma `name`, `this._shapeName = name`, `this._animating = false`, `this._progress = 0`. No llama a `morphStep` (las partículas quedan en el origen = progreso 0).

- [ ] **Step 1: Escribir el test que falla**

En `tests/particles.test.mjs`, agregar `ParticleSystem` al import (`import { ..., ParticleSystem } from '../particles.js'`) y este test. Nota: se usa `Object.create(ParticleSystem.prototype)` para probar el método **sin** el constructor (que necesita canvas/window, no disponibles en Node) — mismo patrón que ya permite testear las funciones puras.

```js
test('beginMorph: fija targets y snapshotea origen, sin animar', () => {
  const ps = createParticles(1, () => 0.5);
  ps[0].x = 5; ps[0].y = 6; ps[0].z = 0.02; // posición "actual"
  const stub = Object.create(ParticleSystem.prototype);
  stub.particles = ps;
  stub._shapes = { punto: [{ x: 1, y: 2, z: 0.1 }] };
  stub._animating = true; // veníamos animando

  stub.beginMorph('punto');

  assert.equal(stub._animating, false, 'no anima por tiempo');
  assert.equal(stub._shapeName, 'punto');
  assert.equal(stub._progress, 0);
  assert.deepEqual([ps[0].ox, ps[0].oy, ps[0].oz], [5, 6, 0.02], 'origen = posición previa');
  assert.deepEqual([ps[0].tx, ps[0].ty, ps[0].tz], [1, 2, 0.1], 'objetivo = forma nueva');
  // no movió las partículas todavía (progreso 0 lo aplica el scroll)
  assert.deepEqual([ps[0].x, ps[0].y], [5, 6]);
});

test('beginMorph: forma inexistente es no-op', () => {
  const ps = createParticles(1, () => 0.5);
  const stub = Object.create(ParticleSystem.prototype);
  stub.particles = ps; stub._shapes = {}; stub._shapeName = 'circulo';
  stub.beginMorph('no-existe');
  assert.equal(stub._shapeName, 'circulo');
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `node --test`
Expected: FAIL — `stub.beginMorph is not a function`.

- [ ] **Step 3: Implementar `beginMorph`**

En `particles.js`, dentro de `ParticleSystem`, justo antes de `morphTo` (~línea 321):

```js
  // Prepara un morph hacia `shapeName` (snapshot del origen + objetivo) SIN animar
  // por tiempo: el número lo maneja el scroll vía setProgressManual. (M3)
  beginMorph(shapeName) {
    const pts = this._shapes[shapeName];
    if (!pts) return;
    setTargets(this.particles, pts);
    this._shapeName = shapeName;
    this._animating = false;
    this._progress = 0;
  }
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add particles.js tests/particles.test.mjs
git commit -m "feat(m3): beginMorph — preparar el morph sin animar (lo drivea el scroll)"
```

---

### Task 3: Offset de render (`offsetX/offsetY`) + `offsetForProgress` puro

El offset de pantalla que hace que el punto recorra la pantalla (SPEC §5.4). El motor suma `offsetX/offsetY` al centro en `_render`; una función pura calcula el offset por progreso (testeable). (design doc §5.2)

**Files:**
- Modify: `particles.js` (función pura nueva + campos y uso en `_render`)
- Test: `tests/particles.test.mjs`

**Interfaces:**
- Consumes: `lerp`.
- Produces:
  - `export function offsetForProgress(progress, from, to): number` — `lerp(from, to, clamp01(progress))`.
  - `ParticleSystem` gana `this.offsetX = 0` y `this.offsetY = 0`; `_render` usa `cx = w/2 + this.offsetX`, `cy = h/2 + this.offsetY`.

- [ ] **Step 1: Escribir el test que falla**

En `tests/particles.test.mjs`, agregar `offsetForProgress` al import y este test:

```js
test('offsetForProgress: interpola from→to y clampea fuera de [0,1]', () => {
  assert.equal(offsetForProgress(0, -100, 100), -100);
  assert.equal(offsetForProgress(1, -100, 100), 100);
  assert.equal(offsetForProgress(0.5, -100, 100), 0);
  assert.equal(offsetForProgress(-2, -100, 100), -100, 'clamp abajo');
  assert.equal(offsetForProgress(2, -100, 100), 100, 'clamp arriba');
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `node --test`
Expected: FAIL — `offsetForProgress is not defined`.

- [ ] **Step 3: Implementar la función pura**

En `particles.js`, junto a las otras funciones puras (debajo de `morphStep`, ~línea 232):

```js
// Offset de pantalla (px) por progreso, clampeado. El punto que "recorre la
// pantalla" (SPEC §5.4) mueve offsetX de un borde al otro con el scroll.
export function offsetForProgress(progress, from, to) {
  const t = Math.min(1, Math.max(0, progress));
  return lerp(from, to, t);
}
```

- [ ] **Step 4: Agregar los campos y usarlos en `_render`**

En el constructor (junto a los otros defaults, ~línea 313):

```js
    this.offsetX = 0; this.offsetY = 0; // desplazamiento del centro en pantalla (px)
```

En `_render` (~línea 429), cambiar la línea del centro:

```js
    const cx = w / 2 + this.offsetX, cy = h / 2 + this.offsetY, size = Math.min(w, h) * 0.42;
```

- [ ] **Step 5: Correr los tests y verlos pasar**

Run: `node --test`
Expected: PASS (los nuevos + todo M2 verde).

- [ ] **Step 6: Commit**

```bash
git add particles.js tests/particles.test.mjs
git commit -m "feat(m3): offset de render + offsetForProgress (el punto recorre la pantalla)"
```

---

### Task 4: `lightbox.js` — componente de lightbox de YouTube reutilizable

Componente reutilizable (SPEC §5.1): un `<dialog>` con `<iframe>` de YouTube inyectado **al abrir** (lazy) y destruido al cerrar. La parte pura (armar la URL de embed) se testea en Node; el DOM se verifica visualmente. Sigue el patrón de `particles.js`: nada de `document` en el top-level del módulo.

**Files:**
- Create: `lightbox.js`
- Test: `tests/lightbox.test.mjs`

**Interfaces:**
- Produces:
  - `export function youtubeEmbedUrl(id, { autoplay = true } = {}): string` — `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0&modestbranding=1` (autoplay `0` si `autoplay:false`).
  - `export function crearLightbox({ videoId }): { open(triggerEl), close(), el }` — arma el `<dialog role="dialog" aria-modal>` (una sola vez, lo appendea a `document.body`), inyecta el `<iframe>` recién en `open()` y lo remueve en `close()` (frena el video). Cierra por botón ✕, `Esc` y click en el backdrop; devuelve el foco al `triggerEl` al cerrar.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/lightbox.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeEmbedUrl } from '../lightbox.js';

test('youtubeEmbedUrl: embed nocookie con el id y flags esperados', () => {
  const url = youtubeEmbedUrl('RQfjTjdYvTQ');
  assert.ok(url.startsWith('https://www.youtube-nocookie.com/embed/RQfjTjdYvTQ?'), url);
  assert.match(url, /autoplay=1/);
  assert.match(url, /rel=0/);
  assert.match(url, /modestbranding=1/);
});

test('youtubeEmbedUrl: autoplay:false apaga el autoplay', () => {
  assert.match(youtubeEmbedUrl('abc', { autoplay: false }), /autoplay=0/);
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `node --test`
Expected: FAIL — no existe `../lightbox.js`.

- [ ] **Step 3: Implementar `lightbox.js`**

Crear `lightbox.js`:

```js
// lightbox.js — lightbox de YouTube reutilizable (SPEC §5.1).
// Parte pura arriba (testeable en Node); el DOM vive dentro de crearLightbox
// (no se toca document al importar el módulo).

export function youtubeEmbedUrl(id, { autoplay = true } = {}) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

// Crea UNA vez el <dialog> y lo reutiliza. El <iframe> se inyecta al abrir
// (no carga YouTube en el load de la home) y se destruye al cerrar (frena el video).
export function crearLightbox({ videoId }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Demoreel de VAIVÉN');
  dialog.innerHTML = `
    <div class="lightbox__inner">
      <button class="lightbox__close" aria-label="Cerrar">✕</button>
      <div class="lightbox__frame"></div>
    </div>`;
  document.body.appendChild(dialog);

  const frame = dialog.querySelector('.lightbox__frame');
  const closeBtn = dialog.querySelector('.lightbox__close');
  let lastFocus = null;

  function open(triggerEl) {
    lastFocus = triggerEl || null;
    const iframe = document.createElement('iframe');
    iframe.src = youtubeEmbedUrl(videoId);
    iframe.title = 'Demoreel de VAIVÉN';
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.setAttribute('allowfullscreen', '');
    frame.appendChild(iframe);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', ''); // fallback si no hay <dialog> nativo
    closeBtn.focus();
  }

  function close() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    frame.replaceChildren(); // destruye el iframe → frena el video
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  closeBtn.addEventListener('click', close);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); }); // backdrop

  return { open, close, el: dialog };
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Chequear sintaxis del módulo entero (incluye el DOM)**

Run: `node --check lightbox.js`
Expected: sin salida (sintaxis OK).

- [ ] **Step 6: Commit**

```bash
git add lightbox.js tests/lightbox.test.mjs
git commit -m "feat(m3): componente de lightbox de YouTube reutilizable (lazy iframe)"
```

---

### Task 5: `index.html` + `home.css` — canvas, ojo como imagen, tema con scroll y estilos del lightbox

Andamiaje del navegador: el `<canvas>` a pantalla completa detrás del contenido, el botón del ojo pasa a `<img>`, el tema oscuro gateado por `.scroll-on` (para no romper el piso sin JS), el fade-in del texto y los estilos del lightbox. **No** agrega el `<script>` de `scroll.js` todavía (eso va en la Task 6, cuando el archivo existe). Sin JS, la home sigue como el esqueleto de M1: texto oscuro sobre blanco.

**Files:**
- Modify: `index.html` (canvas nuevo; botón del ojo)
- Modify: `home.css` (canvas fijo, tema `.scroll-on`, fade-in, lightbox)

**Interfaces:**
- Consumes: nada nuevo (assets ya presentes: `resources/hero/ojo1.png`).
- Produces: `<canvas id="escena">` en el DOM; clase `scroll-on` en `<html>` (la agrega `scroll.js` en runtime); clases CSS `is-in` (reveal por sección) y `.lightbox*` (consumidas por `lightbox.js`).

- [ ] **Step 1: Agregar el canvas a `index.html`**

Inmediatamente después de `<body>` (antes de `<nav>`, línea 9-10):

```html
  <canvas id="escena" aria-hidden="true"></canvas>
```

- [ ] **Step 2: Cambiar el botón del ojo a imagen**

Reemplazar el botón del ojo (línea 21):

```html
      <button class="ojo" aria-label="Abrí el ojo — ver demoreel" data-tooltip="abrí el ojo"><img src="resources/hero/ojo1.png" alt="" width="28" height="28"></button>
```

- [ ] **Step 3: Agregar los estilos a `home.css`**

Al final de `home.css`:

```css
/* --- Milestone 3: canvas de partículas + tema con scroll --- */

/* Canvas pinneado a pantalla completa, detrás del contenido. El campo negro es
   el fondo de las partículas (clearRect deja ver este background). */
#escena {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; background: var(--negro);
  display: none; /* aparece solo cuando corre JS */
}
.scroll-on #escena { display: block; }
main { position: relative; z-index: 1; } /* contenido por encima del canvas */

/* Tema oscuro: SOLO con JS (.scroll-on). Sin JS queda el esqueleto de M1
   (texto oscuro sobre blanco), legible. Piso no-negociable. */
.scroll-on { background: var(--negro); }
.scroll-on body { color: var(--blanco); }
/* los bloques narrativos pierden su fondo sólido: se ve el canvas detrás */
.scroll-on .bloque { background: transparent; }
.scroll-on .herramienta { border-color: currentColor; }
/* Portfolio (bloque 8, scroll normal de M4): fondo opaco para que el canvas no se cuele */
.scroll-on .portfolio { background: var(--blanco); color: var(--negro); }

/* Fade-in simple del texto al entrar cada bloque (M3: sin coreografía fina, eso es M5).
   Gateado por .scroll-on para no ocultar nada sin JS. */
.scroll-on .bloque > * { opacity: 0; transform: translateY(12px); transition: opacity .6s ease, transform .6s ease; }
.scroll-on .bloque.is-in > * { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .scroll-on .bloque > * { opacity: 1; transform: none; transition: none; }
}

/* Lightbox del demoreel (lightbox.js) */
.lightbox { border: 0; padding: 0; background: transparent; max-width: 90vw; max-height: 90vh; }
.lightbox::backdrop { background: rgba(0,0,0,.8); }
.lightbox__inner { position: relative; }
.lightbox__frame { position: relative; width: min(90vw, 160vh); aspect-ratio: 16 / 9; }
.lightbox__frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.lightbox__close {
  position: absolute; top: -2.5rem; right: 0; z-index: 1;
  background: none; border: 0; color: var(--blanco); font-size: 1.5rem; cursor: pointer;
}
```

- [ ] **Step 4: Verificar que el piso sin JS sigue legible**

Abrir `index.html` como archivo (o con el server estático) **sin** que corra `scroll.js` todavía: el texto se ve oscuro sobre blanco, el `<canvas>` está `display:none`, el ojo muestra la imagen. (Checklist para el gate visual; no hay test automático de CSS.)

- [ ] **Step 5: Commit**

```bash
git add index.html home.css
git commit -m "feat(m3): canvas de escena, ojo como imagen y tema oscuro gateado por JS"
```

---

### Task 6: `scroll.js` — orquestación: morphs por bloque, offset del punto, lightbox y fallback

El pegamento de navegador que ata todo: instancia el sistema, registra el cerebro real en modo líneas, crea un `ScrollTrigger` por sección (scrub) que scrubbea el morph + efectos del bloque, cablea el ojo al lightbox, y aplica el fallback (sin scrub) para reduced-motion / mobile. Browser-only: se verifica por `node --check` + checklist visual de Lourdes. La lógica pura que usa ya está testeada (Tasks 1–4).

**Files:**
- Create: `scroll.js`
- Modify: `index.html` (agregar el `<script type="module" src="scroll.js">` al final del body)

**Interfaces:**
- Consumes: de `particles.js` → `ParticleSystem`, `PALETTE`, `easeInOutCubic`, `easeOutBack`, `easeInQuart`, `offsetForProgress`, `sampleShape`, `maskBrainLineArt`; de `lightbox.js` → `crearLightbox`; de GSAP → `gsap`, `ScrollTrigger`.
- Produces: nada importable (es un entrypoint). En runtime: agrega `scroll-on` a `<html>`, arranca el sistema y registra los ScrollTriggers.

- [ ] **Step 1: Implementar `scroll.js`**

Crear `scroll.js`:

```js
// scroll.js — Milestone 3: cablea el sistema de partículas al scroll de la home.
// Browser-only (GSAP+ScrollTrigger por CDN + DOM). La lógica pura vive en
// particles.js y lightbox.js (testeadas en Node). Enfoque A del design doc.
import gsap from 'https://esm.sh/gsap@3.12.5';
import ScrollTrigger from 'https://esm.sh/gsap@3.12.5/ScrollTrigger';
import {
  ParticleSystem, PALETTE,
  easeInOutCubic, easeOutBack, easeInQuart,
  offsetForProgress, sampleShape, maskBrainLineArt,
} from './particles.js';
import { crearLightbox } from './lightbox.js';

gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add('scroll-on'); // activa el tema oscuro

const canvas = document.getElementById('escena');
const system = new ParticleSystem(canvas, { count: 12000 });
system.pointSize = 2.5;                 // defaults de M2
system.anclaColor = PALETTE.lila;
system.bgColor = '#000000';
system.pair = [PALETTE.naranja, PALETTE.azul];
system.paletteMix = 0;
system.start();

// Estado inicial (Hero): cerebro formado, impulso, rotación lenta.
system.beginMorph('cerebro');
system.setProgressManual(1);

// Cerebro real en modo líneas; hasta que cargue el PNG queda el placeholder.
(async () => {
  try {
    const pts = await sampleShape('resources/cerebro.png', system.count, maskBrainLineArt);
    system.registerShape('cerebro', pts);
    if (system._shapeName === 'cerebro') { system.beginMorph('cerebro'); system.setProgressManual(1); }
  } catch (e) { console.warn('cerebro no cargó; queda el placeholder', e); }
})();

// Lightbox del demoreel en el ojo (lazy).
const lightbox = crearLightbox({ videoId: 'RQfjTjdYvTQ' });
const ojo = document.querySelector('.ojo');
if (ojo) ojo.addEventListener('click', () => lightbox.open(ojo));

// Mapa bloque → estado (design doc §4). El vaivén de color: impulso→ancla→impulso→ancla.
const IMPULSO = [PALETTE.naranja, PALETTE.azul];
const BLOCKS = [
  // apertura: cerebro→círculo que crece; ease de arranque lento
  { id: 'apertura',     shape: 'circulo', ease: easeInQuart,    pair: IMPULSO, mix: 0, trails: false },
  // herramientas: círculo→cerebro; la paleta vira a ancla con el scroll
  { id: 'herramientas', shape: 'cerebro', ease: easeInOutCubic, pair: IMPULSO, mix: 1, trails: false, mixScrub: true },
  // punto: cerebro→punto y el punto RECORRE la pantalla; vuelve el color; estelas on
  { id: 'punto',        shape: 'punto',   ease: easeOutBack,    pair: IMPULSO, mix: 0, trails: true,  sweep: true },
  // bifurcación: punto→cinco cúmulos
  { id: 'bifurcacion',  shape: 'cinco',   ease: easeOutBack,    pair: IMPULSO, mix: 0, trails: true },
  // nosotros: se apagan las estelas, quedan 5 anclas (paleta ancla)
  { id: 'nosotros',     shape: 'cinco',   ease: easeInOutCubic, pair: IMPULSO, mix: 1, trails: false },
  // manifiesto: cinco→un círculo central que crece (ancla)
  { id: 'manifiesto',   shape: 'circulo', ease: easeInOutCubic, pair: IMPULSO, mix: 1, trails: false },
  // contacto: partículas sueltas rotando de fondo (modo libre)
  { id: 'contacto',     shape: 'circulo', ease: easeInOutCubic, pair: IMPULSO, mix: 0.3, trails: false, free: true },
];

const reduced = system.reducedMotion || window.innerWidth < 768;

function applyEnter(b, finalize) {
  system.ease = b.ease;
  system.pair = b.pair;
  system.setTrails(b.trails);
  system.rotationSpeed = b.free ? 0.15 : 0.3;
  if (!b.mixScrub) system.paletteMix = b.mix;
  system.beginMorph(b.shape);
  if (finalize) { // fallback: forma final directa, sin scrub
    system.setProgressManual(1);
    system.paletteMix = b.mix;
    system.offsetX = 0;
  }
}

function applyScrub(b, p) {
  system.setProgressManual(p);
  if (b.mixScrub) system.paletteMix = p;
  system.offsetX = b.sweep ? offsetForProgress(p, -window.innerWidth * 0.4, window.innerWidth * 0.4) : 0;
}

for (const b of BLOCKS) {
  const el = document.getElementById(b.id);
  if (!el) continue;
  if (reduced) {
    ScrollTrigger.create({
      trigger: el, start: 'top 60%',
      onEnter: () => applyEnter(b, true),
      onEnterBack: () => applyEnter(b, true),
    });
  } else {
    ScrollTrigger.create({
      trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1,
      onEnter: () => applyEnter(b, false),
      onEnterBack: () => applyEnter(b, false),
      onUpdate: (self) => applyScrub(b, self.progress),
    });
  }
}

// Fade-in del texto al entrar cada bloque (todas las secciones, incluidas Hero y Portfolio).
for (const el of document.querySelectorAll('.bloque')) {
  ScrollTrigger.create({ trigger: el, start: 'top 75%', once: true, onEnter: () => el.classList.add('is-in') });
}
```

- [ ] **Step 2: Chequear sintaxis**

Run: `node --check scroll.js`
Expected: sin salida (sintaxis OK; `node --check` no resuelve los imports de CDN).

- [ ] **Step 3: Agregar el `<script>` a `index.html`**

Al final del `<body>`, después del `<script type="module">` de `data.js` (línea ~115), agregar:

```html
  <script type="module" src="scroll.js"></script>
```

- [ ] **Step 4: Correr toda la suite (asegurar que nada de M2/M3 se rompió)**

Run: `node --test`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add scroll.js index.html
git commit -m "feat(m3): scroll.js — morphs por bloque, offset del punto, lightbox y fallback"
```

- [ ] **Step 6: Verificación visual (Lourdes) — checklist del gate**

Servir con un server estático de Node (Python no está instalado; `file://` no anda con ES modules) y abrir la home en Chrome. Mirar por bloque:
1. **Hero:** cerebro (líneas) formado, rotando lento; texto claro legible sobre el campo negro.
2. **Apertura:** al scrollear, cerebro→círculo que crece.
3. **Herramientas:** círculo→cerebro; el color vira de naranja/azul a lila (ancla) con el scroll.
4. **Punto:** cerebro→punto y el punto **recorre la pantalla** de un lado al otro, con estela.
5. **Bifurcación:** el punto se abre en 5 cúmulos.
6. **Nosotros:** se apagan las estelas, quedan 5 anclas; fotos del equipo.
7. **Manifiesto:** los 5 → un círculo central que crece; texto adentro.
8. **Portfolio:** fondo opaco, el canvas no se cuela.
9. **Contacto:** partículas sueltas rotando de fondo.
- **Ojo:** abre el lightbox del demoreel; cierra con ✕, `Esc` y click afuera; el video frena al cerrar; el foco vuelve al ojo.
- **Reduced-motion / mobile (<768px):** cada bloque muestra su forma final sin scrub ni estelas, scroll normal, texto legible.
- **Sin JS:** el esqueleto de M1 se lee (texto oscuro sobre blanco).

---

## Self-Review

**Spec coverage (design doc §§1–8):**
- §2 Enfoque A (canvas fixed + ScrollTrigger scrub por bloque) → Task 6. ✅
- §3 montaje (`index.html` canvas + ojo img; `scroll.js`; `home.css`) → Tasks 5, 6. ✅
- §4 mapa bloque→estado (1→7 + 9) → `BLOCKS` en Task 6. ✅ (Hero = estado inicial; Portfolio sin entrada, tapado por fondo opaco — coincide con la nota del §4.)
- §5.1 `beginMorph` → Task 2. ✅  §5.2 offset → Task 3. ✅  §5.3 ease por bloque → Task 1. ✅
- §6 lightbox (lazy, Esc/backdrop/✕, foco) → Task 4 + cableado en Task 6. ✅
- §7 reduced-motion / mobile (mismo camino, sin scrub) → rama `reduced` en Task 6; fade-in desactivado en reduced-motion (CSS Task 5). ✅
- §7 sin JS legible → tema gateado por `.scroll-on`, Task 5. ✅
- §8 testing (beginMorph, offset, easings puros; visual por Lourdes; gate humano) → Tasks 1–3 + Step 6 de Task 6. ✅

**Placeholder scan:** sin TBD/TODO/"manejar edge cases"; cada step de código trae el código real. ✅

**Type/nombre consistency:** `beginMorph`, `setProgressManual(v, this.ease)`, `offsetForProgress(progress, from, to)`, `this.ease`, `this.offsetX/Y`, `youtubeEmbedUrl(id, {autoplay})`, `crearLightbox({videoId})→{open,close,el}` usados igual en las Tasks que los definen y en `scroll.js`. ✅

**Riesgos / a afinar en el gate visual (no bloquean el plan):**
- El snap de `offsetX` a 0 al pasar de "punto" (barrido a +0.4·w) a "bifurcación" puede notarse; si molesta, se suaviza en el pulido (M5) o se ajustan los rangos.
- Versión de GSAP fijada a `3.12.5` vía `esm.sh`; si Lourdes prefiere otra versión/CDN se cambia en `scroll.js`.
- El tema oscuro (texto claro sobre negro) es una decisión del design doc §3; el detalle fino de contraste/tipografía por bloque es visual y se ajusta en el gate / M5.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-09-14-vaiven-landing-milestone-3.md`. Dos opciones de ejecución:

1. **Subagent-Driven (recomendado)** — despacho un subagente fresco por task, con review entre tasks; iteración rápida. Encaja con el flujo SDD que venimos usando en M1/M2 y con el gate humano al final.
2. **Inline** — ejecuto las tasks en esta sesión con checkpoints para revisar.

¿Cuál preferís?
