# SPEC — Nueva home de VAIVÉN

**Repo:** proyecto nuevo, desde cero. **TODO: definir el repositorio** (deploy previsto en GitHub Pages → `vaiven.lourdesschaab.com`).
**Para:** Claude Code
**Objetivo:** construir desde cero una página única, narrativa y guiada por scroll. No hay proyecto ni home anterior sobre la que apoyarse: todo el HTML, CSS, JS y los assets se crean en este repo.

---

## 0. Reglas del encargo

1. **Vanilla por defecto.** El proyecto es vanilla HTML/CSS/JS, sin build step. Crear un `CLAUDE.md` en el repo que lo exija. Se autoriza exactamente una librería, por CDN, y hay que documentar el motivo en el commit:
   - **GSAP + ScrollTrigger** — sincronizar la narrativa con el scroll a mano es frágil y largo. Justificación obligatoria en `CLAUDE.md`.
   - El sistema de partículas es un `<canvas>` 2D (§3): **no** se usa WebGL ni Three.js.
2. **No inventar contenido.** Todo lo que no esté en este spec va a `data.js` como campo vacío con un `TODO:`. Si falta una pieza, la tarjeta no se renderiza. Prohibido escribir descripciones de proyectos, nombres de piezas o frases del equipo que no estén acá.
3. **Un solo sistema de partículas.** No programar nueve efectos. Ver §3.
4. **Todo se construye de 0.** No hay página anterior, ni código ni assets heredados. Cada archivo listado en §8 se crea en este proyecto.
5. **Commits chicos, uno por bloque**, con la página funcionando después de cada uno.

---

## 1. Orden de construcción

Construir **en este orden**, verificando que la página quede usable después de cada paso:

1. Esqueleto estático: los 9 bloques con contenido real, sin animación, scroll normal.
2. El sistema de partículas (§3) aislado, en `lab.html`, sin scroll.
3. Cablear el sistema al scroll (§4).
4. Portfolio horizontal (§5.8).
5. Pasada de color, texturas y hover (§6).
6. Fallbacks: reduced-motion, sin WebGL, mobile (§7).

El paso 1 tiene que quedar completo y navegable antes de empezar el 2. Una página fea y terminada es la base; una hermosa por la mitad no sirve.

---

## 2. Sistema visual

**Tipografía:** Montserrat Alternates, única familia. Jerarquía solo por peso, tamaño y mayúsculas. Hay que cargarla en el proyecto (Google Fonts o self-hosted).

**Color:** la base de la página es blanco y negro. El color entra **solo en los momentos de impulso** (hero, bifurcación, portfolio) y se apaga a gris en los momentos de ancla (herramientas, manifiesto). Es el vaivén hecho color, no decoración.

Definir estos 11 tokens en `home.css` (son la única paleta válida) y usar únicamente esos:

```
#FF5B23 naranja    #3A39FF azul       ← par complementario
#511F99 violeta    #FFCC00 amarillo   ← par complementario
#ADE6ED verde-agua #B4B4ED lila
#167A72 verde      #1A237E azul-oscuro
#D9D2CC gris-claro  negro  blanco
```

Los duotonos de fotos y partículas se arman con los pares complementarios, nunca mezclando pares.

**Textura de papel recortado:** filtro SVG reutilizable, `feTurbulence` + `feDisplacementMap`, aplicado como máscara sobre el borde de los círculos y las tarjetas. Definirlo una sola vez en un `<svg>` oculto al final del `<body>` y referenciarlo por `filter: url(#papercut)`. Parámetros de arranque: `baseFrequency="0.04"`, `numOctaves="3"`, `scale="6"`.

---

## 3. El sistema de partículas (el corazón del trabajo)

**Un solo `<canvas>` 2D**, fijo a pantalla completa, `position: fixed`, detrás del contenido. No usar WebGL: el 2D alcanza y se construye en una fracción del tiempo.

### Modelo de datos

Un array de N partículas (arrancar en **4000**, ajustar por performance). Cada una:

```js
{ x, y, z,        // posición actual
  tx, ty, tz,     // posición objetivo
  ox, oy, oz,     // posición de origen (para interpolar)
  seed }          // ruido individual, para que no se muevan todas igual
```

### Generación de formas

Función `sampleShape(imagePath, count)`:
1. Dibuja el PNG en un canvas oculto.
2. Lee `getImageData`, recorre píxeles con alpha > 128.
3. Elige `count` posiciones al azar entre esos píxeles.
4. Normaliza a un espacio de -1 a 1, y asigna `z` aleatorio en una banda fina (-0.15 a 0.15) para que la forma tenga espesor y la rotación se lea.

Las formas se precalculan **una sola vez** al cargar y se guardan. Nunca re-muestrear durante el scroll.

Formas necesarias:
- `cerebro` — desde `resources/cerebro.png` (PNG blanco sobre transparente, silueta cerrada). **TODO: falta el asset, pedirlo.**
- `punto` — todas las partículas convergen a un radio de 0.02.
- `cinco` — cinco cúmulos circulares, posiciones generadas por código (no hace falta PNG).
- `circulo` — un disco lleno.

### Render

Proyección en perspectiva simple:

```js
const scale = fov / (fov + p.z * depth);
const sx = cx + p.x * scale * size;
const sy = cy + p.y * scale * size;
```

Rotación sobre el eje Y aplicando la rotación a `x` y `z` antes de proyectar. El tamaño del punto sale de `scale`, así los que están más cerca se ven más grandes.

Dibujar con `fillRect` de 1–2px, no `arc()`. Con 4000 partículas la diferencia de performance es enorme.

### Transiciones

Una sola función `morphTo(shapeName, progress)` donde `progress` va de 0 a 1 e interpola cada partícula entre `origen` y `objetivo` con un easing. **Todos** los momentos de la página son llamadas a esta función con distintas formas. El scroll solo mueve ese número.

### Estelas

En vez de limpiar el canvas con `clearRect`, pintar un rectángulo blanco semitransparente (`rgba(255,255,255,0.08)`) encima. Los puntos dejan rastro solo. Activar este modo únicamente en los bloques 4 y 5, y limpiar del todo al salir.

---

## 4. Scroll

GSAP ScrollTrigger. El canvas está pinneado durante toda la secuencia narrativa (bloques 1 a 7). Cada bloque es un `ScrollTrigger` con `scrub: 1` que mapea su progreso a una llamada de `morphTo` o a un parámetro de rotación.

**Mezcla de scrolls (decisión tomada, es deliberado):** scroll normal en el arranque, scroll pinneado y scrubbeado en el tramo narrativo, y scroll horizontal en el portfolio. El mareo es intencional.

**Escape obligatorio:** una nav mínima fija arriba — logo a la izquierda, y a la derecha `Trabajos · Nosotros · Contacto`. Es la única forma de que alguien que quiere ver el portfolio no tenga que atravesar siete momentos de partículas. Discreta, blanco y negro, sin fondo. *(Si Lourdes decide sacarla, que lo diga explícitamente; por defecto va.)*

---

## 5. Los nueve bloques

> Todas las frases marcadas **[PROPUESTA]** están pendientes de validación de Lourdes. Claude Code las escribe tal cual y no las modifica. Las frases sin marca están aprobadas.

### 5.1 Hero

- Fondo: portadas del portfolio en grilla, con `filter: blur(24px)` y saturación baja.
- Centro: el cerebro de partículas, que **reacciona al puntero** (las partículas cercanas al mouse se desplazan y vuelven).
- Título: **IR Y VENIR**
- Subtítulo: **NOS DA NUEVAS MIRADAS**
- Arriba a la derecha: el ícono del ojo. Al clickearlo abre el demoreel en lightbox. Microcopy al hover: *"abrí el ojo"* **[PROPUESTA]**
- Construir un componente de lightbox de YouTube reutilizable para el demoreel. Escribirlo una sola vez por si otros bloques lo necesitan.
- **TODO: falta el asset del ícono del ojo.**
- **TODO: falta el ID de YouTube del demoreel.**

### 5.2 La apertura

Al scrollear, la apertura del hero se expande hasta ocupar la pantalla entera de un color plano. Sin copy: es transición pura.

### 5.3 Cerebro + herramientas + categorías

El cerebro queda en primer plano y **rota lentamente** mientras aparecen, escalonadas, las herramientas y las cinco categorías.

Entrada: *"Acá abajo está la parte ordenada: qué hacemos y con qué."* **[PROPUESTA]**

Categorías (las cinco son obligatorias, el orden es este):

| Categoría | Línea **[PROPUESTA]** |
|---|---|
| Ilustración y Diseño Gráfico | Empezamos por lo que se ve. |
| Modelado 3D | Si no existe, lo construimos. |
| Motion Graphics | Nada se queda quieto. |
| Desarrollo web | Y después hay que hacerlo andar. |
| Campañas publicitarias | Lo de afuera también lo pensamos nosotros. |

Herramientas: los logos flotan alrededor del cerebro y aparecen con el scroll.
**TODO: falta la lista real y completa de herramientas del grupo. Como referencia parcial circulan estos tags (blender, substance, after-effects, illustrator, photoshop, figma, html, css, js, php), pero está incompleta — faltan Unreal, Unity y lo de video mapping. Pedir la lista real a Lourdes antes de implementar.**

### 5.4 El punto y la estela

El cerebro colapsa a un punto. Modo estela activado. El punto recorre la pantalla de una punta a la otra mientras se scrollea. Sin copy.

**Esto es el vaivén**: el ir y venir se ejecuta acá, con el recorrido del punto. No hace falta explicarlo en ningún lado.

### 5.5 La bifurcación

El punto se divide en cinco. Cada uno se va a su posición final. Sin copy.

### 5.6 Quiénes somos

Las estelas se desvanecen. Quedan cinco círculos con textura de papel recortado.

- **Círculo central:** foto de un integrante + su frase + su rol.
- **Cuatro círculos alrededor:** video (o foto) del ojo de cada uno de los otros.
- Al scrollear, las fotos desaparecen y el círculo central empieza a crecer.

Estructura de datos en `data.js`:

```js
equipo: [
  { nombre: "Agustina", rol: "Directora Creativa", frase: "Dale que se puede",
    foto: "resources/nosotros/agustina.jpg", ojo: "resources/nosotros/ojo-agustina.mp4" },
  { nombre: "Lourdes",  rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
  { nombre: "Matías",   rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
  { nombre: "Bautista", rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
  { nombre: "Victoria", rol: "TODO", frase: "TODO", foto: "TODO", ojo: "TODO" },
]
```

**Si un `ojo` es `TODO`, el círculo muestra la foto fija tratada en duotono.** El bloque nunca debe verse roto por falta de video.

### 5.7 El círculo gigante: el manifiesto

El círculo central ocupa la pantalla. Adentro va el **texto del manifiesto, copiado literal del TP5.3**. No reescribirlo, no editarlo, no resumirlo — está validado por el grupo y por la cátedra.
**TODO: pegar el texto del manifiesto.**

### 5.8 Portfolio

Carrusel horizontal, scroll secuestrado, las tarjetas pasan de un lado al otro. Cada tarjeta:

```js
{ titulo, descripcion, herramienta, categoria, imagen, url }
```

- `descripcion`: máximo tres líneas, tono cómplice.
- `herramienta`: dato seco, sin adjetivos.
- `url`: link a la página individual del proyecto (pueden no existir todavía; si está vacío, la tarjeta no linkea).

**TODO: falta el inventario completo de piezas. No hay material cargado en el repo todavía; hay que reunir las piezas por categoría (título, descripción, herramienta, imagen). No inventar tarjetas: si una categoría no tiene piezas, no aparece.**

**Hover:** aberración cromática. Implementar primero la versión barata — dos pseudo-elementos con la imagen desplazada 2px y `mix-blend-mode`, uno teñido de `#FF5B23` y otro de `#3A39FF`. Si queda pobre, recién ahí escalar a canvas. **Esto es lo primero que se corta si complica algo.**

### 5.9 Contacto

- Mail en tamaño gigante, ocupando el ancho.
- Redes sociales abajo, chicas.
- Partículas sueltas rotando de fondo (reusar el mismo sistema, modo libre).
- Sin formulario. GitHub Pages no corre PHP y un formulario es superficie de falla para cero mensajes reales.
- Cierre: *"Escribinos. Ir y venir también es contestar."* **[PROPUESTA]**
- **TODO: falta el mail y los handles de redes.**

---

## 6. Calidad mínima

- `prefers-reduced-motion`: el canvas renderiza la forma final de cada bloque sin morphear, y el scroll es normal. Implementar este patrón desde el arranque del sistema de partículas.
- Foco de teclado visible en la nav, el ojo y las tarjetas.
- El contenido tiene que ser legible con JavaScript desactivado: HTML semántico primero, animación encima.
- Imágenes con `loading="lazy"` salvo las del hero.
- Presupuesto: la secuencia narrativa tiene que sostener 60fps en una notebook común. Si baja, reducir el conteo de partículas antes que sacar momentos.

## 7. Mobile

Debajo de 768px: se apaga el scroll secuestrado y el horizontal. Los nueve bloques se apilan y scrollean normal. El canvas renderiza la forma correspondiente a cada bloque, estática. Es fallback, no diseño responsive completo — pero la página **no puede romperse** en un celular.

---

## 8. Estructura de archivos

```
index.html          ← la página
home.css            ← estilos y los 11 tokens de color (§2)
data.js             ← equipo, categorías, herramientas, piezas del portfolio
particles.js        ← el sistema completo de §3
scroll.js           ← todos los ScrollTrigger
lab.html            ← banco de pruebas del sistema de partículas, no se deploya
```

---

## 9. Qué falta y bloquea

Claude Code debe **parar y preguntar** si llega a uno de estos puntos sin el dato:

1. Inventario del portfolio: piezas por categoría, con título, descripción, herramienta e imagen.
2. Lista real y completa de herramientas del grupo.
3. Frases, roles, fotos y videos de ojo de los cinco.
4. Texto del manifiesto (TP5.3).
5. ID de YouTube del demoreel.
6. El PNG del cerebro, silueta cerrada, fondo transparente.
7. Mail de contacto y handles de redes.