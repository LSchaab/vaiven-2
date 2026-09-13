# VAIVÉN Landing — Milestone 1 (Esqueleto estático) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar publicada en `vaiven.lourdesschaab.com` una home de 9 bloques con el contenido real aprobado, HTML semántico legible sin JS, scroll normal y sin animación — la base terminada sobre la que se montan las partículas y el scroll.

**Architecture:** Sitio estático vanilla, sin build step. El spine narrativo (copy fijo aprobado) va directo en HTML semántico para ser legible con JS desactivado. Las colecciones variables (equipo, herramientas, piezas del portfolio) viven en `data.js` y se renderizan con un pequeño bootstrap `<script type="module">` inline; una pieza sin datos no se renderiza. Deploy por GitHub Pages desde `main` con CNAME.

**Tech Stack:** HTML5 semántico, CSS3 (custom properties para los 11 tokens), JavaScript ES modules vanilla. Sin librerías en el Milestone 1 (GSAP entra en el Milestone 3). Google Fonts para Montserrat Alternates. GitHub Pages para hosting.

## Global Constraints

Copiadas verbatim del spec y las fuentes de verdad. Aplican a **todas** las tareas:

- **Vanilla por defecto, sin build step.** Única librería autorizada en todo el proyecto: GSAP + ScrollTrigger por CDN (no se usa en este milestone). Partículas serán canvas 2D, sin WebGL/Three.js.
- **No inventar contenido.** Todo lo que no esté aprobado va a `data.js` como campo vacío con `TODO:`. Si falta una pieza, la tarjeta **no se renderiza**. Prohibido escribir descripciones, nombres de piezas o frases del equipo no aprobadas.
- **Frases canónicas intocables:** ADN = "Somos un grupo que navega los extremos para encontrar el camino." · Tagline = "Ir y venir nos da nuevas miradas." Variantes incorrectas a evitar: "recorre los extremos", "ir y volver".
- **Manifiesto literal** (TP5.3), sin resumir ni editar:
  > Nos perdemos para encontrarnos.
  > Habitamos los extremos, no nos quedamos callados y siempre tenemos un por qué.
  > El movimiento y la honestidad bruta nos hace sentir vivos.
  > Alguien tiene que mover las cosas.
  > Ir y venir nos da nuevas miradas.
  > Vaivén.
- **Paleta: 11 tokens exactos, azul = `#2222a0`.** `#FF5B23` naranja, `#2222a0` azul, `#511F99` violeta, `#FFCC00` amarillo, `#ADE6ED` verde-agua, `#B4B4ED` lila, `#167A72` verde, `#1A237E` azul-oscuro, `#D9D2CC` gris-claro, negro, blanco. Pares complementarios: naranja/azul y violeta/amarillo.
- **Tipografía:** Montserrat Alternates, familia única. Jerarquía solo por peso, tamaño y mayúsculas.
- **Idioma/tono:** español rioplatense de Buenos Aires, voseo. Irónico, cómplice, cercano. Nunca corporativo.
- **Copy aprobado en esta iteración** (ya no es `[PROPUESTA]`): ver Task 4 y Task 5.
- **Legible sin JS:** HTML semántico primero, animación encima. Imágenes con `loading="lazy"` salvo hero. Foco de teclado visible en nav, ojo y tarjetas.
- **Repo:** `LSchaab/vaiven`. Deploy Pages desde `main`, CNAME `vaiven.lourdesschaab.com`.

---

## File Structure

Archivos creados en este milestone (subconjunto del §8 del SPEC; `particles.js`, `scroll.js` y `lab.html` se crean en milestones posteriores):

- `index.html` — la página: 9 bloques semánticos con copy fijo + contenedores para las colecciones + bootstrap de render inline.
- `home.css` — los 11 tokens como custom properties, carga de fuente, layout base, estilos de nav y de los 9 bloques (estáticos).
- `data.js` — módulo ES que exporta `equipo`, `herramientas`, `categorias`, `portfolio`. Solo datos, sin lógica.
- `CLAUDE.md` — regla vanilla + justificación de GSAP.
- `CNAME` — `vaiven.lourdesschaab.com`.
- `.gitignore` — básico (OS/editor cruft).
- `README.md` — una línea de qué es + cómo correrlo local.

Responsabilidades: `index.html` es estructura + copy fijo; `home.css` es todo el estilo; `data.js` es la única fuente de contenido variable; el bootstrap de render vive inline en `index.html` (no se agrega archivo, para respetar el §8 y mantener `data.js` puro).

---

### Task 1: Scaffold del repo + pipeline de deploy

**Files:**
- Create: `index.html`, `home.css`, `data.js`, `CLAUDE.md`, `CNAME`, `.gitignore`, `README.md`

**Interfaces:**
- Consumes: nada (primer task).
- Produces: repo `LSchaab/vaiven` con `main` publicado en `vaiven.lourdesschaab.com`; archivos base vacíos/mínimos que los tasks siguientes rellenan.

- [ ] **Step 1: Crear los archivos base mínimos**

`index.html` mínimo válido:
```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VAIVÉN</title>
  <link rel="stylesheet" href="home.css">
</head>
<body>
  <main><h1>VAIVÉN</h1></main>
</body>
</html>
```

`CNAME` (una sola línea, sin protocolo):
```
vaiven.lourdesschaab.com
```

`CLAUDE.md`:
```markdown
# VAIVÉN — reglas del repo

Proyecto vanilla HTML/CSS/JS, **sin build step**. No agregar frameworks ni bundlers.

Única librería autorizada: **GSAP + ScrollTrigger**, por CDN.
Motivo: sincronizar la narrativa con el scroll a mano (pin, scrub, timelines por
bloque) es frágil y largo; ScrollTrigger lo resuelve de forma estándar. Se usa a
partir del cableado de scroll (Milestone 3), no antes.

El sistema de partículas es **canvas 2D**. No WebGL, no Three.js.

No inventar contenido: lo que falta va a `data.js` como `TODO:` y no se renderiza.
```

`.gitignore`:
```
.DS_Store
Thumbs.db
*.log
.vscode/
```

`README.md`:
```markdown
# VAIVÉN

Home única, narrativa, guiada por scroll. Vanilla HTML/CSS/JS, sin build.

Correr local: abrir `index.html` con un server estático, ej. `python -m http.server`
o la extensión Live Server. (Se usan ES modules, así que `file://` directo no alcanza.)
```

`home.css` y `data.js` se crean vacíos (se rellenan en Tasks 2–5).

- [ ] **Step 2: Inicializar git y primer commit**

```bash
git init
git add -A
git commit -m "chore: scaffold repo vaivén (vanilla, sin build)"
```

- [ ] **Step 3: Crear el repo remoto y pushear**

```bash
gh repo create LSchaab/vaiven --public --source=. --remote=origin --push
```
Expected: el repo existe en GitHub y `main` está pusheado.

- [ ] **Step 4: Habilitar GitHub Pages desde `main`**

```bash
gh api -X POST repos/LSchaab/vaiven/pages -f source.branch=main -f source.path=/
```
Si ya existe, usar `-X PUT`. Expected: Pages queda configurado con custom domain (el `CNAME` en el repo lo setea).

- [ ] **Step 5: Verificar el deploy**

Esperar el build de Pages (~1 min) y abrir en Chrome:
```bash
start chrome "https://vaiven.lourdesschaab.com"
```
Expected: se ve "VAIVÉN" (el `<h1>` mínimo). Si el DNS/CNAME todavía no propaga, verificar en `https://lschaab.github.io/vaiven/` como fallback y anotarlo para el review.

- [ ] **Step 6: Commit** (ya hecho en Step 2; nada nuevo que commitear salvo ajustes)

---

### Task 2: Tokens de color, fuente y base de CSS

**Files:**
- Modify: `home.css`

**Interfaces:**
- Consumes: nada de otros tasks.
- Produces: custom properties `--naranja`, `--azul`, `--violeta`, `--amarillo`, `--verde-agua`, `--lila`, `--verde`, `--azul-oscuro`, `--gris-claro`, `--negro`, `--blanco`; clase utilitaria de contenedor; reset base. Los tasks 3–5 usan estas variables.

- [ ] **Step 1: Escribir el bloque de tokens + reset + fuente**

```css
/* home.css */
@import url('https://fonts.googleapis.com/css2?family=Montserrat+Alternates:wght@400;500;600;700;800&display=swap');

:root {
  --naranja: #FF5B23;  --azul: #2222a0;
  --violeta: #511F99;  --amarillo: #FFCC00;
  --verde-agua: #ADE6ED; --lila: #B4B4ED;
  --verde: #167A72;    --azul-oscuro: #1A237E;
  --gris-claro: #D9D2CC; --negro: #000; --blanco: #fff;
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: 'Montserrat Alternates', system-ui, sans-serif;
  color: var(--negro);
  background: var(--blanco);
  line-height: 1.3;
}
img, video { max-width: 100%; display: block; }

:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }

.bloque { min-height: 100vh; display: grid; place-content: center; padding: 6vw; }
```

- [ ] **Step 2: Verificar tokens y fuente en el navegador**

Recargar `vaiven.lourdesschaab.com` (o local) y en DevTools Console:
```js
getComputedStyle(document.body).fontFamily        // incluye "Montserrat Alternates"
getComputedStyle(document.documentElement).getPropertyValue('--azul').trim()  // "#2222a0"
```
Expected: la fuente cargó (el `<h1>` se ve en Montserrat Alternates) y `--azul` = `#2222a0`.

- [ ] **Step 3: Commit**

```bash
git add home.css
git commit -m "feat: 11 tokens de color (azul #2222a0), montserrat alternates y reset base"
```

---

### Task 3: Nav de escape

**Files:**
- Modify: `index.html`, `home.css`

**Interfaces:**
- Consumes: tokens de Task 2.
- Produces: `<nav>` fija con enlaces ancla a `#trabajos`, `#nosotros`, `#contacto` (los ids se crean en Task 4). Logo textual "VAIVÉN" a la izquierda.

- [ ] **Step 1: Agregar el markup de la nav** (dentro de `<body>`, antes de `<main>`)

```html
<nav class="nav" aria-label="Principal">
  <a class="nav__logo" href="#top">VAIVÉN</a>
  <ul class="nav__links">
    <li><a href="#trabajos">Trabajos</a></li>
    <li><a href="#nosotros">Nosotros</a></li>
    <li><a href="#contacto">Contacto</a></li>
  </ul>
</nav>
```

- [ ] **Step 2: Estilar la nav** (en `home.css`)

```css
.nav {
  position: fixed; inset: 0 0 auto 0; z-index: 100;
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 6vw; mix-blend-mode: difference;
}
.nav__logo { font-weight: 800; letter-spacing: .02em; color: var(--blanco); text-decoration: none; }
.nav__links { list-style: none; display: flex; gap: 1.5rem; margin: 0; padding: 0; }
.nav__links a { color: var(--blanco); text-decoration: none; font-weight: 500; }
.nav__links a:hover { text-decoration: underline; }
```
(`mix-blend-mode: difference` mantiene la nav legible sobre fondos claros y oscuros sin fondo propio, como pide el SPEC.)

- [ ] **Step 3: Verificar navegación por teclado y enlaces**

Abrir en Chrome, tabular: el foco debe verse (outline azul) en logo y 3 enlaces. Los enlaces todavía no saltan a ningún lado (los ids llegan en Task 4) — eso se valida al final de Task 4.

- [ ] **Step 4: Commit**

```bash
git add index.html home.css
git commit -m "feat: nav de escape fija (logo + trabajos/nosotros/contacto)"
```

---

### Task 4: Los 9 bloques estáticos con copy fijo aprobado

**Files:**
- Modify: `index.html`, `home.css`

**Interfaces:**
- Consumes: tokens (Task 2), nav (Task 3).
- Produces: 9 `<section class="bloque" id="...">` con el copy fijo. Contenedores vacíos con ids conocidos que Task 5 rellena: `#herramientas-list`, `#categorias-list`, `#equipo-grid`, `#portfolio-track`. Anclas `#nosotros`, `#trabajos`, `#contacto`, `#top`.

Copy fijo y aprobado a usar **verbatim** (nada más, nada inventado):

- Hero: título **IR Y VENIR**, subtítulo **NOS DA NUEVAS MIRADAS**, microcopy del ojo (hover) **abrí el ojo**.
- Bloque 3 entrada: **Acá abajo está la parte ordenada: qué hacemos y con qué.**
- Categorías (nombre + línea, en este orden): Ilustración y Diseño Gráfico — **Empezamos por lo que se ve.** · Modelado 3D — **Si no existe, lo construimos.** · Motion Graphics — **Nada se queda quieto.** · Desarrollo web — **Y después hay que hacerlo andar.** · Campañas publicitarias — **Y que además lo vea todo el mundo.**
- Manifiesto: el texto literal de Global Constraints.
- Contacto cierre: **Escribinos. Ir y venir también es contestar.**

- [ ] **Step 1: Reemplazar `<main>` por los 9 bloques**

```html
<main id="top">
  <!-- 5.1 Hero -->
  <section class="bloque hero" id="hero">
    <button class="ojo" aria-label="Abrí el ojo — ver demoreel" data-tooltip="abrí el ojo">👁</button>
    <h1 class="hero__titulo">IR Y VENIR</h1>
    <p class="hero__subtitulo">NOS DA NUEVAS MIRADAS</p>
  </section>

  <!-- 5.2 La apertura -->
  <section class="bloque apertura" id="apertura" aria-hidden="true"></section>

  <!-- 5.3 Cerebro + herramientas + categorías -->
  <section class="bloque herramientas" id="herramientas">
    <p class="entrada">Acá abajo está la parte ordenada: qué hacemos y con qué.</p>
    <ul class="herramientas-list" id="herramientas-list"></ul>
    <ol class="categorias-list" id="categorias-list"></ol>
  </section>

  <!-- 5.4 El punto y la estela -->
  <section class="bloque punto" id="punto" aria-hidden="true"></section>

  <!-- 5.5 La bifurcación -->
  <section class="bloque bifurcacion" id="bifurcacion" aria-hidden="true"></section>

  <!-- 5.6 Quiénes somos -->
  <section class="bloque nosotros" id="nosotros">
    <h2>Quiénes somos</h2>
    <div class="equipo-grid" id="equipo-grid"></div>
  </section>

  <!-- 5.7 El manifiesto -->
  <section class="bloque manifiesto" id="manifiesto">
    <blockquote class="manifiesto__texto">
      <p>Nos perdemos para encontrarnos.</p>
      <p>Habitamos los extremos, no nos quedamos callados y siempre tenemos un por qué.</p>
      <p>El movimiento y la honestidad bruta nos hace sentir vivos.</p>
      <p>Alguien tiene que mover las cosas.</p>
      <p>Ir y venir nos da nuevas miradas.</p>
      <p>Vaivén.</p>
    </blockquote>
  </section>

  <!-- 5.8 Portfolio -->
  <section class="bloque portfolio" id="trabajos">
    <h2>Trabajos</h2>
    <div class="portfolio-track" id="portfolio-track"></div>
  </section>

  <!-- 5.9 Contacto -->
  <section class="bloque contacto" id="contacto">
    <a class="contacto__mail" id="contacto-mail" href="#">TODO: mail</a>
    <ul class="contacto__redes" id="contacto-redes"></ul>
    <p class="contacto__cierre">Escribinos. Ir y venir también es contestar.</p>
  </section>
</main>
```

- [ ] **Step 2: Estilos mínimos de los bloques** (en `home.css`)

```css
.hero__titulo { font-size: clamp(3rem, 12vw, 10rem); font-weight: 800; margin: 0; }
.hero__subtitulo { font-size: clamp(1rem, 3vw, 2rem); font-weight: 500; letter-spacing: .1em; margin: .5rem 0 0; }
.ojo { position: fixed; top: 1rem; right: 6vw; z-index: 101; background: none; border: 0; font-size: 1.5rem; cursor: pointer; }
.ojo[data-tooltip]:hover::after { content: attr(data-tooltip); position: absolute; top: 100%; right: 0; font-size: .8rem; white-space: nowrap; }
.entrada { font-weight: 600; text-align: center; max-width: 28ch; }
.categorias-list { list-style: none; padding: 0; }
.manifiesto__texto { font-size: clamp(1.2rem, 3vw, 2.2rem); font-weight: 600; max-width: 20ch; text-align: center; border: 0; }
.manifiesto__texto p { margin: .2em 0; }
/* momentos de ancla en gris, de impulso quedan en blanco/negro por ahora */
.herramientas, .manifiesto { background: var(--gris-claro); }
```

- [ ] **Step 3: Verificar spine narrativo legible SIN JS**

En Chrome DevTools → Command Menu → "Disable JavaScript", recargar. Expected: se ven hero, la entrada del bloque 3, el manifiesto completo y el cierre de contacto (los contenedores de colecciones quedan vacíos — eso es esperado, se llenan con JS en Task 5). Verificar que **no hay copy inventado**: solo las frases aprobadas.

- [ ] **Step 4: Verificar anclas de la nav**

Reactivar JS, clickear "Trabajos", "Nosotros", "Contacto" en la nav. Expected: la página scrollea a `#trabajos`, `#nosotros`, `#contacto` respectivamente.

- [ ] **Step 5: Commit**

```bash
git add index.html home.css
git commit -m "feat: 9 bloques estaticos con copy fijo aprobado + manifiesto literal"
```

---

### Task 5: `data.js` + render de colecciones (equipo, herramientas, portfolio)

> **Depende de contenido de Lourdes (on-demand).** Antes de escribir `data.js`, el implementador debe **pedirle a Lourdes**: (1) lista real y completa de herramientas; (2) por cada integrante — rol, frase, ruta de foto en `resources/nosotros/`, ruta de video de ojo (o `TODO`); (3) inventario parcial del portfolio — por pieza: título, descripción (máx. 3 líneas), herramienta, categoría, ruta de imagen, url (opcional); (4) mail de contacto y handles de redes. Lo que Lourdes no tenga se carga como `"TODO"` y **no se renderiza**.

**Files:**
- Modify: `data.js`, `index.html` (bootstrap de render inline), `home.css`

**Interfaces:**
- Consumes: contenedores `#herramientas-list`, `#categorias-list`, `#equipo-grid`, `#portfolio-track`, `#contacto-mail`, `#contacto-redes` (Task 4).
- Produces: `data.js` exporta `export const equipo`, `herramientas`, `categorias`, `portfolio`, `contacto`. El bootstrap las renderiza saltando cualquier ítem con campos `TODO`/vacíos.

- [ ] **Step 1: Escribir `data.js` con el contenido real recibido**

Estructura (rellenar con lo que pase Lourdes; ejemplo con Agustina que ya está definida y placeholders `TODO` para lo faltante):
```js
// data.js — única fuente de contenido variable. Nada inventado: falta = "TODO".
export const categorias = [
  { nombre: "Ilustración y Diseño Gráfico", linea: "Empezamos por lo que se ve." },
  { nombre: "Modelado 3D", linea: "Si no existe, lo construimos." },
  { nombre: "Motion Graphics", linea: "Nada se queda quieto." },
  { nombre: "Desarrollo web", linea: "Y después hay que hacerlo andar." },
  { nombre: "Campañas publicitarias", linea: "Y que además lo vea todo el mundo." },
];

export const herramientas = [ /* TODO: lista real de Lourdes, ej "blender", "figma", ... */ ];

export const equipo = [
  { nombre: "Agustina", rol: "Directora Creativa", frase: "Dale que se puede",
    foto: "resources/nosotros/agustina.jpg", ojo: "resources/nosotros/ojo-agustina.mp4" },
  { nombre: "Lourdes",  rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
  { nombre: "Matías",   rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
  { nombre: "Bautista", rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
  { nombre: "Victoria", rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
];

export const portfolio = [ /* TODO: piezas reales; cada una {titulo, descripcion, herramienta, categoria, imagen, url} */ ];

export const contacto = { mail: "TODO", redes: [ /* {nombre, url} */ ] };
```

- [ ] **Step 2: Escribir el bootstrap de render** (inline al final de `<body>` en `index.html`)

```html
<script type="module">
  import { herramientas, categorias, equipo, portfolio, contacto } from './data.js';
  const isTodo = v => !v || v === 'TODO';
  const $ = id => document.getElementById(id);

  // Herramientas (solo strings no vacíos)
  $('herramientas-list').innerHTML = herramientas
    .filter(h => !isTodo(h))
    .map(h => `<li class="herramienta">${h}</li>`).join('');

  // Categorías (fijas, siempre 5)
  $('categorias-list').innerHTML = categorias
    .map(c => `<li class="categoria"><span class="categoria__nombre">${c.nombre}</span><span class="categoria__linea">${c.linea}</span></li>`).join('');

  // Equipo: renderiza el integrante aunque falte el ojo; si falta foto+rol, se saltea
  $('equipo-grid').innerHTML = equipo
    .filter(m => !isTodo(m.foto) && !isTodo(m.rol))
    .map(m => `<figure class="miembro">
        <img src="${m.foto}" alt="${m.nombre}" loading="lazy">
        <figcaption><strong>${m.nombre}</strong> — ${m.rol}${isTodo(m.frase) ? '' : `<br><em>“${m.frase}”</em>`}</figcaption>
      </figure>`).join('');

  // Portfolio: una pieza sin titulo o sin imagen no se renderiza
  $('portfolio-track').innerHTML = portfolio
    .filter(p => !isTodo(p.titulo) && !isTodo(p.imagen))
    .map(p => {
      const card = `<article class="tarjeta" data-categoria="${p.categoria ?? ''}">
          <img src="${p.imagen}" alt="${p.titulo}" loading="lazy">
          <h3>${p.titulo}</h3>
          ${isTodo(p.descripcion) ? '' : `<p>${p.descripcion}</p>`}
          ${isTodo(p.herramienta) ? '' : `<span class="tarjeta__tool">${p.herramienta}</span>`}
        </article>`;
      return isTodo(p.url) ? card : `<a class="tarjeta-link" href="${p.url}">${card}</a>`;
    }).join('');

  // Contacto
  if (!isTodo(contacto.mail)) {
    const mail = $('contacto-mail'); mail.textContent = contacto.mail; mail.href = `mailto:${contacto.mail}`;
  }
  $('contacto-redes').innerHTML = (contacto.redes ?? [])
    .filter(r => r && !isTodo(r.url))
    .map(r => `<li><a href="${r.url}">${r.nombre}</a></li>`).join('');
</script>
```

- [ ] **Step 3: Estilos mínimos de las colecciones** (en `home.css`)

```css
.herramientas-list { list-style: none; display: flex; flex-wrap: wrap; gap: .5rem; padding: 0; justify-content: center; }
.herramienta { border: 1px solid var(--negro); border-radius: 999px; padding: .2rem .8rem; font-size: .85rem; }
.categoria { display: flex; flex-direction: column; margin: .6rem 0; }
.categoria__nombre { font-weight: 700; }
.categoria__linea { font-weight: 400; opacity: .8; }
.equipo-grid { display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center; }
.miembro img { width: 160px; height: 160px; object-fit: cover; border-radius: 50%; }
.miembro figcaption { text-align: center; margin-top: .5rem; }
.portfolio-track { display: flex; gap: 1.5rem; overflow-x: auto; padding-bottom: 1rem; } /* horizontal real llega en Milestone 4 */
.tarjeta { flex: 0 0 300px; }
.tarjeta img { aspect-ratio: 4/3; object-fit: cover; }
.tarjeta__tool { font-size: .8rem; opacity: .7; }
```

- [ ] **Step 4: Verificar el render y el salteo de faltantes**

Abrir en Chrome. Expected: las 5 categorías con sus líneas; el/los integrante(s) con foto y rol renderizan (Agustina sí; los `TODO` no); las herramientas reales aparecen como chips; las piezas de portfolio con título+imagen aparecen y las incompletas no; el mail solo aparece si no es `TODO`. En Console, `document.querySelectorAll('.tarjeta').length` = cantidad de piezas válidas.

- [ ] **Step 5: Commit**

```bash
git add data.js index.html home.css
git commit -m "feat: data.js + render de equipo/herramientas/categorias/portfolio (falta = no renderiza)"
```

---

### Task 6: Revisión de milestone (gate humano)

**Files:** ninguno (verificación + deploy).

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: página desplegada y checklist de revisión para Lourdes; OK explícito antes del Milestone 2.

- [ ] **Step 1: Push y verificar deploy**

```bash
git push
```
Esperar el build de Pages y abrir `https://vaiven.lourdesschaab.com` en Chrome.

- [ ] **Step 2: Correr el checklist y presentárselo a Lourdes**

Checklist de qué mirar:
- [ ] Los 9 bloques existen y se scrollean con scroll normal.
- [ ] Copy fijo exacto: "IR Y VENIR" / "NOS DA NUEVAS MIRADAS", entrada del bloque 3, 5 categorías con sus líneas, manifiesto literal, cierre de contacto. Sin nada inventado.
- [ ] Con JS desactivado se leen hero, entrada, manifiesto y cierre.
- [ ] Nav fija visible sobre fondos claros y oscuros; foco de teclado visible; las 3 anclas saltan bien.
- [ ] Azul renderizado = `#2222a0`; fuente Montserrat Alternates.
- [ ] Colecciones: lo real renderiza, lo `TODO` no rompe ni aparece.
- [ ] Sitio publicado en el dominio real (o URL de `github.io` si el DNS aún propaga).

- [ ] **Step 3: Esperar OK de Lourdes.** No arrancar el Milestone 2 sin aprobación.

---

## Roadmap — Milestones 2 a 6 (planes propios al llegar)

Cada uno recibirá su plan detallado bite-sized cuando lleguemos, con el contenido ya en mano y con la base del milestone anterior aprobada:

- **Milestone 2 — Sistema de partículas** (`particles.js`, `lab.html`): modelo de 4000 partículas, `sampleShape(imagePath, count)`, formas (cerebro desde PNG, punto, cinco, círculo), render en perspectiva con `fillRect`, `morphTo(shapeName, progress)`, estelas, y **Palanca A** (partículas en color / desaturación a gris). `prefers-reduced-motion` desde el inicio. Requiere el PNG del cerebro.
- **Milestone 3 — Cablear scroll** (`scroll.js`): GSAP + ScrollTrigger por CDN, canvas pinneado bloques 1–7, un ScrollTrigger `scrub` por bloque mapeando progreso a `morphTo`/rotación, y **Palanca C** (easing por bloque). Lightbox de YouTube reutilizable (requiere ID del demoreel).
- **Milestone 4 — Portfolio horizontal**: scroll secuestrado, carrusel único ordenado por `data.js`, hover de aberración cromática (versión barata con pseudo-elementos primero).
- **Milestone 5 — Color, texturas y hover**: filtro `#papercut` (feTurbulence + feDisplacementMap) sobre círculos/tarjetas, **Palanca D** (grano global), pasada de duotonos. **Palanca B** (motivo de orden/blueprint como ancla) como *stretch* si sobra tiempo.
- **Milestone 6 — Fallbacks**: `prefers-reduced-motion` (forma final estática, scroll normal), mobile <768px (bloques apilados, canvas estático por bloque), presupuesto 60fps (bajar conteo de partículas antes que sacar momentos).

---

## Self-Review

**Spec coverage (Milestone 1):** repo+deploy (Task 1) ✓, tokens/fuente/azul `#2222a0` (Task 2) ✓, nav de escape (Task 3) ✓, 9 bloques + copy fijo aprobado + manifiesto literal + legible sin JS (Task 4) ✓, data.js + colecciones con regla "falta = no renderiza" (Task 5) ✓, review gate (Task 6) ✓. Milestones 2–6 del SPEC: cubiertos por el roadmap, con plan propio al llegar (decisión de descomposición, no placeholder).

**Placeholder scan:** los `TODO` que quedan en `data.js` son intencionales y exigidos por la regla "no inventar contenido" del spec — no son placeholders del plan. Todo step tiene el contenido concreto (código real, comandos reales, verificación concreta).

**Type consistency:** ids de contenedores consistentes entre Task 4 (markup) y Task 5 (render): `#herramientas-list`, `#categorias-list`, `#equipo-grid`, `#portfolio-track`, `#contacto-mail`, `#contacto-redes`. Exports de `data.js` (`equipo`, `herramientas`, `categorias`, `portfolio`, `contacto`) coinciden con el import del bootstrap. Helper `isTodo` usado consistentemente.
