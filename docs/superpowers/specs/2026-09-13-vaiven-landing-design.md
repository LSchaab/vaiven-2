# Design — Landing de VAIVÉN

**Fecha:** 2026-09-13
**Autora del proyecto:** Lourdes Schaab (programadora de VAIVÉN)
**Fuentes de verdad:** `SPEC — Nueva home de VAIVÉN.md` y `context.md` (en la raíz del repo). Este documento **no los reemplaza**: registra las decisiones tomadas en la sesión de grilling + brainstorming del 2026-09-13 y las resuelve por encima del SPEC. Ante conflicto, gana este documento; para todo lo no listado acá, manda el SPEC.

---

## 1. Qué construimos

La home única, narrativa y guiada por scroll de VAIVÉN, tal como la describe el SPEC: 9 bloques, sistema de partículas en canvas 2D, scroll pinneado/scrubbeado con GSAP + ScrollTrigger, portfolio horizontal. Vanilla HTML/CSS/JS, sin build step.

**Alcance:** la experiencia completa del SPEC, no una versión recortada. El **piso no-negociable** es el esqueleto estático con contenido real (paso 1 del SPEC); las partículas y el scroll son una capa que puede degradarse (reduced-motion, mobile, menos partículas) sin romper la entrega.

**Deadline:** sin fecha dura. Ventana de ~1 semana; la meta es terminar cuanto antes para dejar margen a correcciones.

---

## 2. Decisiones cerradas en el grilling

### 2.1 Infraestructura y deploy
- Repo `vaiven` bajo la cuenta de GitHub **`LSchaab`** (la que ya tiene autenticada el `gh` CLI). `git init` en esta carpeta (`vaiven-2`).
- Deploy a **GitHub Pages desde `main`**, con **CNAME a `vaiven.lourdesschaab.com`**, activo **desde el milestone 1** (esqueleto navegable). Siempre hay algo publicado y revisable en el dominio real.
- Única librería autorizada: **GSAP + ScrollTrigger** por CDN, con el motivo documentado en `CLAUDE.md`. Partículas en **canvas 2D**, sin WebGL ni Three.js.

### 2.2 Paleta — conflicto resuelto
El token del **azul** difería entre docs. Queda canónico el del `context.md` / export de Figma:

- **Azul = `#2222a0`** (NO `#3A39FF`).
- Acción pendiente: actualizar el SPEC §2 para eliminar la discrepancia.

Los otros 10 tokens quedan como en ambos docs. Los duotonos se arman con pares complementarios: **naranja `#FF5B23` / azul `#2222a0`** y **violeta `#511F99` / amarillo `#FFCC00`**, nunca mezclando pares.

### 2.3 Tipografía y nav
- **Montserrat Alternates** vía **Google Fonts** (self-host queda como opción futura si el presupuesto de performance lo pide).
- **Nav de escape va** (default del SPEC): logo a la izquierda, `Trabajos · Nosotros · Contacto` a la derecha. Discreta, blanco y negro, sin fondo.

### 2.4 Portfolio
- **Un solo carrusel** con todos los proyectos juntos. **No** se divide por categoría.
- La **categoría es un dato de la tarjeta** (dato seco, sin adjetivos), no una sección.
- **Orden de las tarjetas = orden de `data.js`.** Reordenar no toca código.
- Inventario **parcial** hoy: se construye con las piezas reales que haya; no se inventan tarjetas. Se completa después editando solo `data.js`.

### 2.5 Contenido — handoff
- **Assets los carga Lourdes** en `resources/` con los nombres que ya define el SPEC (`resources/cerebro.png`, `resources/nosotros/agustina.jpg`, etc.).
- **El texto se pide on-demand** por milestone; Claude arma `data.js` con lo que Lourdes pega. Nada se inventa: dato faltante = `TODO` que no renderiza.
- Estado de los bloqueadores del §9 del SPEC declarado por Lourdes:
  - Manifiesto — **resuelto** (ya está literal en `context.md` §2).
  - Inventario del portfolio — **parcial**.
  - Lista de herramientas — **lo tiene**.
  - Frases / roles / fotos / videos de ojo de los 5 — **lo tiene**.
  - ID de YouTube del demoreel — **lo tiene**.
  - PNG del cerebro — **lo tiene**.
  - Mail + handles de redes — **lo tiene**.

### 2.6 Workflow de revisión
- Milestones = los 6 pasos del §1 del SPEC.
- Después de cada milestone: Claude **abre la página en Chrome local** + deja un checklist corto de qué mirar. **No arranca el siguiente milestone sin OK de Lourdes.**

---

## 3. Copy aprobado (deja de ser `[PROPUESTA]`)

Las frases canónicas (ADN, tagline, manifiesto) no se tocan. Estas quedan **aprobadas** por Lourdes en esta sesión:

| Ubicación | Texto aprobado |
|---|---|
| Ícono del ojo (hover) | **abrí el ojo** |
| Entrada bloque 3 | **Acá abajo está la parte ordenada: qué hacemos y con qué.** |
| Cat. Ilustración y Diseño Gráfico | **Empezamos por lo que se ve.** |
| Cat. Modelado 3D | **Si no existe, lo construimos.** |
| Cat. Motion Graphics | **Nada se queda quieto.** |
| Cat. Desarrollo web | **Y después hay que hacerlo andar.** |
| Cat. Campañas publicitarias | **Y que además lo vea todo el mundo.** |
| Cierre de contacto | **Escribinos. Ir y venir también es contestar.** |

Estas cinco líneas de categoría cierran un recorrido: se ve → existe → se mueve → anda → se muestra.

---

## 4. Estrategia de diferenciación visual

**Problema (regla 6 del `context.md`):** los sitios de micropartículas en blanco y negro son un género saturado. Lo que separa a VAIVÉN es el **color de opuestos complementarios** y el concepto **impulso / ancla**.

Cuatro palancas, ordenadas por costo/dificultad de implementación. Se mapean solas al orden de construcción del SPEC:

| # | Palanca | Costo | Estado | Milestone |
|---|---|---|---|---|
| A | **Partículas con color** — nunca blancas | BAJO / impacto altísimo | **Comprometida** | 2 (sistema de partículas) |
| C | **Fricción en el easing** — curva distinta por bloque | BAJO en código, medio en tuning | **Comprometida** | 3 (cablear scroll) |
| D | **Textura hecha a mano** — papercut + grano global | BAJO-MEDIO | **Comprometida** | 5 (color/texturas) |
| B | **Motivo de orden como ancla** — reglas, ticks, blueprint | MEDIO-ALTO / la más riesgosa | **Stretch** | 5 (si sobra tiempo) |

### A — Partículas con color (comprometida, prioritaria)
El white-dot sobre negro *es* el cliché. En los momentos de **impulso** (hero, bifurcación, portfolio) las partículas van teñidas en duotono con los pares complementarios (asignación por `seed` o por `x`). En los momentos de **ancla** (herramientas, manifiesto) un parámetro de paleta las **desatura a gris a la vista**, y esa desaturación se lee como el freno. Implementación: `fillStyle` + interpolación de color driveada por el mismo progreso de scroll. Cero arquitectura nueva. Nace en color desde el milestone 2.

### C — Fricción en el easing (comprometida)
El SPEC ya mezcla tipos de scroll a propósito ("el mareo es intencional"). Se suma que el *easing* encarne el péndulo: overshoot/snappy en los bloques de impulso, asentamiento lento y pesado en los de ancla. No es código nuevo, es elegir curvas por bloque en GSAP. El costo es iterar el feel.

### D — Textura hecha a mano (comprometida)
Filtro papercut (`filter: url(#papercut)`, ya especificado) sobre círculos y tarjetas + una capa global de grano/grunge con `mix-blend-mode`. Aleja del glossy digital. Cuidado: aplicar filtros SVG sobre elementos **estáticos**, nunca sobre el canvas, para no matar la performance.

### B — Motivo de orden como ancla (stretch)
Contenido gráfico nuevo (reglas, ticks de coordenadas, etiquetas tipo blueprint) que aparece **solo** en los bloques gris/ancla (herramientas, manifiesto) y desaparece en los de color. El caos de partículas vs. la grilla de medición = impulso/ancla hecho gráfico. Es la apuesta más diferenciadora pero también la más cara (capa nueva + cableado a scroll + diseño). Se hace con la página entera funcionando, sin arriesgar el core.

---

## 5. Plan por milestones

Orden del §1 del SPEC. Cada milestone deja la página usable y termina con revisión humana (Chrome local + checklist, OK de Lourdes antes de seguir).

1. **Esqueleto estático** — los 9 bloques con contenido real, sin animación, scroll normal. Incluye: repo + `git init`, `CLAUDE.md` (regla vanilla + motivo de GSAP), estructura de archivos del §8, los 11 tokens en `home.css` (azul `#2222a0`), Montserrat Alternates, nav de escape, `data.js` con el contenido real que haya + `TODO` para lo faltante, Pages + CNAME activos. **Debe quedar completo y navegable antes del milestone 2.**
2. **Sistema de partículas** aislado en `lab.html`, sin scroll — incluye **Palanca A** (partículas en color, desaturación a gris). 4000 partículas de arranque, `fillRect`, formas precalculadas, reduced-motion desde el inicio.
3. **Cablear el sistema al scroll** — ScrollTrigger, canvas pinneado, `morphTo(shape, progress)` — incluye **Palanca C** (easing por bloque).
4. **Portfolio horizontal** — carrusel único, scroll secuestrado, hover de aberración cromática (versión barata primero; es lo primero que se corta si complica).
5. **Pasada de color, texturas y hover** — **Palanca D** (papercut + grano). **Palanca B** (motivo de orden) acá si sobra tiempo.
6. **Fallbacks** — reduced-motion, mobile <768px (se apila y scrollea normal, canvas estático por bloque), sin romper en celular.

---

## 6. Qué sigue bloqueando / a pedir on-demand

Ninguno bloquea el milestone 1 en sí (se arranca con `TODO`s), pero se piden a medida:
- Milestone 1: lista real de herramientas, frases/roles/fotos/ojos de los 5, mail + handles, ID del demoreel, inventario parcial del portfolio, PNG del cerebro. (Todos declarados "los tengo" salvo el portfolio, "parcial".)
- Confirmar `username` de GitHub al crear el repo → es `LSchaab`.
- Acción de higiene: actualizar el SPEC §2 para fijar azul = `#2222a0`.
