# Design — Milestone 3: cablear el sistema de partículas al scroll

**Fecha:** 2026-09-14
**Autora del proyecto:** Lourdes Schaab (programadora de VAIVÉN)
**Milestone:** 3 de 6 (SPEC §1). Cablear el sistema de partículas de M2 al scroll de la home.
**Fuentes de verdad:** `SPEC — Nueva home de VAIVÉN.md` (§3 motor, §4 scroll, §5 bloques, §6 calidad, §7 mobile) y el design doc general `2026-09-13-vaiven-landing-design.md` (§7 = decisiones de ejecución). Ante conflicto, mandan esos + este doc para lo específico de M3.

---

## 1. Alcance

M3 cablea la **secuencia narrativa de los bloques 1→7** (canvas pinneado, morphs driveados por scroll) más el **lightbox del ojo** (5.1) y las **partículas sueltas de Contacto** (5.9, modo libre). Fuera de M3: el portfolio horizontal (M4), y la coreografía fina de texto/interacción — el hero que reacciona al puntero (5.1) y el stagger sincronizado de herramientas/categorías (5.3) — que van a la pasada de pulido (M5). El texto de los bloques aparece con un **fade-in simple** al entrar en viewport.

**Piso no-negociable:** el esqueleto estático de M1 sigue legible sin JS. El canvas y el scroll son una capa encima que degrada limpio (reduced-motion, mobile).

---

## 2. Enfoque elegido

**ScrollTriggers por bloque, canvas `position: fixed`, motor con tres agregados finos** (fiel al SPEC §4: *"Cada bloque es un ScrollTrigger con `scrub: 1`"*).

- El canvas va `fixed` a pantalla completa detrás del contenido: queda "pinneado" solo, sin necesidad del `pin` de GSAP.
- Cada sección narrativa es un `ScrollTrigger` con `scrub: 1` que mapea su progreso 0→1 a **un morph** más los efectos de ese momento (estelas, paleta impulso↔ancla, offset del punto, rotación).
- `scroll.js` orquesta; `particles.js` sigue siendo el motor puro, con agregados aditivos.

Descartados: (B) una timeline maestra pinneada — más control central pero acopla los 7 momentos y cuesta mapearla a las secciones HTML actuales; (C) IntersectionObserver + `morphTo` sin scrub — pierde el "el scroll mueve el número", que es el corazón del vaivén (el punto que recorre la pantalla necesita scrub). C se reusa como **fallback** de reduced-motion / mobile.

---

## 3. Montaje y archivos

### `index.html`
- `<canvas id="escena">` fijo a pantalla completa, **antes** del `<main>`, detrás del contenido.
- Al final del `<body>`, un `<script type="module">` que arranca `scroll.js`.
- El botón del ojo pasa de emoji a `<img src="resources/hero/ojo1.png" alt="">` (decorativa; el `aria-label` del botón ya describe la acción).

### `scroll.js` (nuevo — SPEC §8)
- Trae GSAP + ScrollTrigger por CDN (autorizado en `CLAUDE.md`).
- Instancia `ParticleSystem`, registra el cerebro real en modo **líneas** (`maskBrainLineArt`) con los defaults de M2: `pointSize` 2.5, densidad 12000, ancla lila `#B4B4ED`.
- Un `ScrollTrigger` por sección narrativa (1→7 y 9), `scrub: 1`: `onUpdate` → `setProgressManual(self.progress)`; `onEnter/onEnterBack` → `beginMorph(forma)` + efectos del bloque.
- El lightbox del ojo (§6 de este doc).

### `home.css`
- `#escena { position: fixed; inset: 0; z-index: -1; }`.
- Los bloques narrativos pierden el fondo sólido (se ve el canvas); el texto queda por encima, legible. Portfolio (8) conserva fondo opaco para que el canvas no se cuele. Clase utilitaria para el fade-in simple del texto al entrar cada bloque.

---

## 4. Mapa bloque → estado de partículas

Cada sección scrubbea un morph (`beginMorph` al entrar, `setProgressManual` con el scroll) más los efectos del momento:

| # | Bloque | Al entrar | scrub 0→1 | paleta | estelas |
|---|---|---|---|---|---|
| 1 | Hero | forma inicial `cerebro`, rotación lenta | se sostiene el cerebro (el morph ocurre en la apertura) | impulso (naranja/azul) | off |
| 2 | Apertura | `beginMorph('circulo')` | cerebro→círculo que crece hasta llenar la pantalla = color plano | impulso → plano | off |
| 3 | Herramientas | `beginMorph('cerebro')` | círculo→cerebro, se asienta y rota lento; `paletteMix` 0→1 | **ancla** (lila/gris) | off |
| 4 | Punto | `beginMorph('punto')` + `setTrails(true)` | cerebro→punto y el punto **recorre la pantalla** (offset de una punta a la otra) | impulso (vuelve el color) | **on** |
| 5 | Bifurcación | `beginMorph('cinco')` | punto→cinco cúmulos, cada uno a su lugar | impulso | on |
| 6 | Nosotros | `setTrails(false)` | las estelas se desvanecen, quedan 5 anclas; fotos del equipo fade-in | ancla | off |
| 7 | Manifiesto | `beginMorph('circulo')` | cinco→un círculo central que crece hasta llenar; texto adentro | ancla/gris | off |
| 9 | Contacto | `beginMorph` modo libre + rotación | partículas sueltas rotando de fondo | impulso suave | off |

El recorrido de color encarna el vaivén: **impulso → ancla → impulso → ancla**. La "fricción" (Palanca C del design doc general) se aplica eligiendo el ease por bloque: overshoot/snappy en los momentos de impulso, asentamiento lento y pesado en los de ancla.

Nota: entre el bloque 7 (manifiesto, fin de la narrativa pinneada) y el 8 (portfolio, scroll normal de M4) el canvas queda tapado por el fondo opaco del portfolio; reaparece en Contacto (9).

---

## 5. Agregados al motor (`particles.js`)

Tres agregados, todos aditivos (no rompen `lab.html` ni los tests actuales). Se respeta la separación en dos capas del archivo: funciones **puras** (testeables en Node) + la clase que orquesta.

1. **`beginMorph(name)`** — hace `setTargets(this.particles, this._shapes[name])` (snapshotea origen = posición actual, fija objetivo) y `this._shapeName = name`, **sin** arrancar la animación por tiempo. Así el scroll maneja el número vía `setProgressManual`. (Hoy `morphTo` anima solo y `setProgressManual` scrubbea, pero falta el "preparar sin animar".) En reduced-motion, `beginMorph` + `setProgressManual(1)` deja la forma final directa.

2. **Offset de render `offsetX/offsetY`** (px de pantalla, default 0) — se suman a `cx,cy` en `_render`. Es lo que hace que el punto recorra la pantalla (5.4): en el bloque 4 el scroll interpola `offsetX` de un borde al otro. Se agrega una función pura que calcula el offset por progreso, para testearla.

3. **Ease por bloque (Palanca C)** — campo `this.ease` (default `easeInOutCubic`) que usan `setProgressManual`/`morphStep`. `scroll.js` lo setea por bloque. Se agregan 2–3 easings puros (`easeOutBack`, `easeInQuart`) al bloque de funciones puras.

---

## 6. Lightbox del ojo (componente reutilizable)

SPEC 5.1: *"construir un componente de lightbox de YouTube reutilizable... escribirlo una sola vez por si otros bloques lo necesitan"*.

- `crearLightbox()` arma un `<dialog>` (o overlay con `role="dialog"` y `aria-modal`) con un `<iframe>` de YouTube (`RQfjTjdYvTQ`).
- **Lazy:** el `<iframe>` se inyecta recién al abrir (no carga YouTube en el load de la home) y se destruye al cerrar (frena el video).
- Cierre por botón ✕, tecla `Esc`, y click en el backdrop.
- Foco atrapado dentro del modal y devuelto al botón del ojo al cerrar (SPEC §6: foco de teclado visible).
- Lo dispara el botón del ojo (`resources/hero/ojo1.png`); microcopy hover "abrí el ojo" ya existe.

---

## 7. Reduced-motion, mobile y calidad

- **`prefers-reduced-motion` (SPEC §6):** `scroll.js` no usa scrub; un IntersectionObserver (o ScrollTrigger sin scrub) hace `beginMorph(forma)` + `setProgressManual(1)` al entrar cada bloque → la forma final de cada momento, sin morphear, con scroll normal. Sin estelas ni auto-rotación. (Es el enfoque C reusado.)
- **Mobile <768px:** para no romper (el fallback responsive completo es M6), M3 aplica el **mismo camino que reduced-motion**: formas estáticas por bloque, scroll normal, sin scrub ni offset del punto.
- **JS desactivado:** el HTML semántico de M1 se lee solo; canvas y scroll son capa encima.
- **Performance (SPEC §6, 60fps en notebook común):** si baja, primero reducir densidad (ya parametrizado) antes de sacar momentos.

---

## 8. Testing y verificación

- **Unit (Node `node --test`):** `beginMorph` fija targets sin animar (`_animating === false`, `ox/oy/oz` = posición previa, `tx/ty/tz` = forma nueva); offset por progreso; los nuevos easings (monótonos, `f(0)=0`, `f(1)=1`, overshoot esperado en `easeOutBack`).
- **Verificación visual:** la hace Lourdes abriendo la home (la extensión de Chrome de Claude no está conectada). Claude deja un checklist corto de qué mirar por bloque, como en M1/M2.
- **Gate humano:** no se arranca M4 sin OK de Lourdes.

---

## 9. Qué queda afuera de M3 (para no re-litigar)

- Portfolio horizontal, scroll secuestrado, aberración cromática → **M4**.
- Hero que reacciona al puntero (5.1) y stagger sincronizado de herramientas/categorías (5.3) → **M5**.
- Texturas papercut + grano global (Palanca D), motivo de orden (Palanca B) → **M5**.
- Fallback responsive mobile completo → **M6** (M3 solo garantiza "no se rompe").
