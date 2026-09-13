# VAIVÉN — reglas del repo

Proyecto vanilla HTML/CSS/JS, **sin build step**. No agregar frameworks ni bundlers.

Default: vanilla. Cada librería nueva se agrega solo con **motivo claro y documentado**.

Librería ya autorizada: **GSAP + ScrollTrigger**, por CDN.
Motivo: sincronizar la narrativa con el scroll a mano (pin, scrub, timelines por
bloque) es frágil y largo; ScrollTrigger lo resuelve de forma estándar. Se usa a
partir del cableado de scroll (Milestone 3), no antes.

**WebGL / Three.js: permitidas si son necesarias para un objetivo concreto** (ej.
un cerebro 3D real que rota mostrando volumen, o muchísimas más partículas de las
que aguanta canvas 2D). No son un default: hay que **argumentar por qué** y
**decirle a Lourdes explícitamente qué asset necesita aportar** (un modelo 3D
`.glb`/`.gltf`, una imagen, etc.) antes de adoptarlas. Si canvas 2D alcanza para
el objetivo, se usa canvas 2D.

No inventar contenido: lo que falta va a `data.js` como `TODO:` y no se renderiza.
