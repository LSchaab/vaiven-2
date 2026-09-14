# VAIVÉN landing — estado y handoff

> Nota viva para retomar en una sesión nueva. Todo está commiteado y pusheado (repo `LSchaab/vaiven-2`).

## Estado (2026-09-13)

- **Milestone 1 — Esqueleto estático** ✅ completo y en vivo (`vaiven.lourdesschaab.com`). Aprobado por Lourdes.
- **Milestone 2 — Sistema de partículas** ✅ completo (`particles.js` + `lab.html`, banco de pruebas, NO deployado). Aprobado por Lourdes.
- **Próximo → Milestone 3 — Cablear al scroll**: GSAP + ScrollTrigger, canvas pinneado detrás de los 9 bloques, morph por bloque, el punto que recorre la pantalla (el vaivén), lightbox de YouTube del ícono del ojo. **Pendiente: brainstorming + plan detallado, luego ejecución.**

## Cómo retomar

1. Abrir una sesión nueva de Claude Code en `C:\Users\Luly\documents\vaiven\vaiven-2`.
2. Pedir: *"Seguimos con el Milestone 3 de la landing de VAIVÉN (scroll)."*
3. Claude debería leer: este archivo, el design doc (§7 = decisiones de ejecución), el SPEC (§4 scroll, §5 bloques), y el ledger de M2.

## Fuentes de verdad

- `SPEC — Nueva home de VAIVÉN.md` y `context.md` (raíz).
- `docs/superpowers/specs/2026-09-13-vaiven-landing-design.md` — decisiones cerradas; **§7 = decisiones tomadas durante la ejecución** (repo, política de librerías, defaults de partículas, cerebro, demoreel ID).
- `docs/superpowers/plans/` — planes de M1 y M2 (M3 se escribe al arrancar).
- `.superpowers/sdd/<plan>/progress.md` — ledger task-por-task de cada milestone (gitignored, en disco local; NO viaja en un clone fresco).

## Flujo de trabajo

- **Subagent-driven development** (`superpowers:subagent-driven-development`): un subagente fresco por task, review por task (spec + calidad), review final de rama, y **gate humano al final de cada milestone** (Lourdes mira y da OK).
- Milestones = los 6 pasos del §1 del SPEC. Un plan detallado por milestone.

## Decisiones clave (no re-litigar)

- Repo `LSchaab/vaiven-2` **público**, deploy GitHub Pages desde `main` + CNAME `vaiven.lourdesschaab.com`. Se sube TODO (docs incluidos).
- Azul canónico **`#2222a0`** (NO `#3A39FF`, que todavía figura en el SPEC §2/§5.8 — corregir cuando se toque el SPEC).
- **WebGL/Three.js permitidas** si hay objetivo concreto + justificación + pedido explícito de asset. Por ahora todo es canvas 2D.
- **Defaults del sistema de partículas** (elegidos por Lourdes): cerebro modo **líneas** (`maskBrainLineArt`), `pointSize` **2.5**, densidad **12000**, color ancla **lila `#B4B4ED`**, fondo de referencia negro.
- **No inventar contenido**: falta = `TODO` en `data.js` = no se renderiza.

## Assets

- ✅ Cerebro: `resources/cerebro.png`. Fotos equipo: `resources/nosotros/*.png`.
- ✅ **Demoreel YouTube ID: `RQfjTjdYvTQ`** (para el lightbox del ojo, M3).
- ⛔ Pendientes: ícono del ojo (M3), inventario del portfolio (M4).

## Gotchas del entorno

- **Python NO está instalado**: para servir el lab (usa ES modules, no anda con `file://`) usar un server estático de **Node**.
- **Extensión Chrome de Claude no conectada**: la verificación visual del canvas se hace **headless** (smoke tests en Node que mockean el canvas) o la hace Lourdes abriendo el lab. Node v24 disponible (`node --test`).
