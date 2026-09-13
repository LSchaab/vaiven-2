# VAIVÉN — reglas del repo

Proyecto vanilla HTML/CSS/JS, **sin build step**. No agregar frameworks ni bundlers.

Única librería autorizada: **GSAP + ScrollTrigger**, por CDN.
Motivo: sincronizar la narrativa con el scroll a mano (pin, scrub, timelines por
bloque) es frágil y largo; ScrollTrigger lo resuelve de forma estándar. Se usa a
partir del cableado de scroll (Milestone 3), no antes.

El sistema de partículas es **canvas 2D**. No WebGL, no Three.js.

No inventar contenido: lo que falta va a `data.js` como `TODO:` y no se renderiza.
