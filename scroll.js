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
    // con secciones de 100vh, start:'top bottom'→end:'top center' da un rango de media
    // pantalla por bloque, sin solaparse con el vecino; el morph completa (progress 1)
    // cuando la sección llega al centro y se queda asentado mientras se lee. Antes
    // (end:'bottom top') los rangos se solapaban ~1 pantalla y los bloques se pisaban el
    // estado compartido (morphs sin completar; el sweep/estelas del punto sangraban a herramientas).
    ScrollTrigger.create({
      trigger: el, start: 'top bottom', end: 'top center', scrub: 1,
      onEnter: () => applyEnter(b, false),
      onEnterBack: () => applyEnter(b, false),
      onUpdate: (self) => applyScrub(b, self.progress),
    });
  }
}

// Fade-in del texto al entrar cada bloque (todas las secciones, incluidas Hero y Portfolio).
for (const el of document.querySelectorAll('.bloque')) {
  ScrollTrigger.create({ trigger: el, start: 'top 75%', once: true, onEnter: () => el.classList.add('is-in') });
  // revelar los bloques ya visibles al cargar (ej. Hero above-the-fold): ScrollTrigger no
  // dispara onEnter de forma fiable para triggers que ya arrancan pasados su start.
  const r = el.getBoundingClientRect();
  if (r.top < window.innerHeight * 0.75) el.classList.add('is-in');
}
