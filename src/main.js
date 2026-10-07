import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { iniciarConsulta } from './consulta.js';
import { iniciarGaleria } from './galeria.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const punteroFino = matchMedia('(hover: hover) and (pointer: fine)').matches;
const movil = matchMedia('(max-width: 1023px)'); // una sola pantalla hasta tablet
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ── Scroll suave (solo con mouse; en táctil queda el nativo) ── */
let lenis = null;
if (!reducido && punteroFino) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.11, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
// Bloqueo de scroll compartido (menú y visor de fotos)
document.addEventListener('bloqueo', (e) => {
  html.classList.toggle('is-bloqueado', e.detail);
  html.style.overflow = e.detail ? 'hidden' : '';
  if (lenis) (e.detail ? lenis.stop() : lenis.start());
});

const altoCabecera = () => $('[data-cabecera]').offsetHeight;
function irA(destino) {
  if (lenis) lenis.scrollTo(destino, { offset: -altoCabecera() + 1, duration: 1.4 });
  else destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
}

/* ── Anclas internas ── */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const destino = id.length > 1 && document.getElementById(id.slice(1));
  if (!destino) return;
  e.preventDefault();
  cerrarMenu();
  irA(destino);
  history.replaceState(null, '', id);
});

/* ── Cabecera: se vuelve sólida al bajar y marca la sección actual ── */
const cabecera = $('[data-cabecera]');
let ticking = false;
const alScroll = () => {
  cabecera.classList.toggle('is-solida', window.scrollY > 24);
  ticking = false;
};
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(alScroll); } }, { passive: true });
alScroll();

const enlacesNav = new Map($$('.cabecera__nav a').map((a) => [a.getAttribute('href').slice(1), a]));
const marcarActual = new IntersectionObserver((entradas) => {
  entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    enlacesNav.forEach((a) => a.classList.remove('is-actual'));
    enlacesNav.get(en.target.id)?.classList.add('is-actual');
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach((s) => marcarActual.observe(s));

/* ── Menú móvil ── */
const menu = $('[data-menu]');
const botonMenu = $('[data-menu-abrir]');
function abrirMenu() {
  menu.hidden = false;
  menu.classList.add('is-abierto');
  botonMenu.setAttribute('aria-expanded', 'true');
  botonMenu.querySelector('.sr-only').textContent = 'Cerrar menú';
  cabecera.classList.add('is-solida');
  document.dispatchEvent(new CustomEvent('bloqueo', { detail: true }));
  menu.querySelector('a')?.focus({ preventScroll: true });
}
function cerrarMenu() {
  if (menu.hidden) return;
  menu.hidden = true;
  menu.classList.remove('is-abierto');
  botonMenu.setAttribute('aria-expanded', 'false');
  botonMenu.querySelector('.sr-only').textContent = 'Abrir menú';
  document.dispatchEvent(new CustomEvent('bloqueo', { detail: false }));
  alScroll();
}
botonMenu.addEventListener('click', () => (menu.hidden ? abrirMenu() : (cerrarMenu(), botonMenu.focus())));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { cerrarMenu(); botonMenu.focus(); } });
matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && cerrarMenu());

/* ── Hero: tres pantallas en escritorio, una que encadena las tomas en el celular ── */
const hero = $('.hero');
const videos = $$('.pantalla video');
const pausa = $('[data-pausa]');
let pausadoPorUsuario = reducido;

function cargarVideos() {
  const enMovil = movil.matches;
  videos.forEach((v, i) => {
    const src = enMovil ? (i === 0 ? v.dataset.srcMovil : null) : v.dataset.src;
    if (!src) { v.pause(); v.removeAttribute('src'); v.load(); return; }
    if (v.getAttribute('src') !== src) { v.src = src; v.load(); }
  });
  reproducir();
}
function reproducir() {
  if (pausadoPorUsuario) return;
  videos.forEach((v) => { if (v.getAttribute('src')) v.play().catch(() => {}); });
}
function pausar() { videos.forEach((v) => v.pause()); }
function actualizarPausa() {
  pausa.setAttribute('aria-pressed', String(pausadoPorUsuario));
  $('[data-pausa-texto]', pausa).textContent = pausadoPorUsuario ? 'Reproducir video' : 'Pausar video';
}
pausa.addEventListener('click', () => {
  pausadoPorUsuario = !pausadoPorUsuario;
  actualizarPausa();
  pausadoPorUsuario ? pausar() : reproducir();
});
actualizarPausa();
cargarVideos();
movil.addEventListener('change', cargarVideos);
let heroVisible = true;
new IntersectionObserver(([en]) => {
  heroVisible = en.isIntersecting;
  heroVisible ? reproducir() : pausar();
}, { threshold: 0.05 }).observe(hero);
// Si la pestaña cargó en segundo plano, el navegador posterga el autoplay: se retoma al volver
document.addEventListener('visibilitychange', () => { if (!document.hidden && heroVisible) reproducir(); });
videos.forEach((v) => v.addEventListener('canplay', () => { if (heroVisible && !document.hidden) reproducir(); }));

// En el celular el rótulo acompaña la toma que se está viendo
const rotulo = $('[data-rotulo]');
const TOMAS = [[5.3, 'La sala'], [10.3, 'El brindis'], [Infinity, 'La pista']];
videos[0].addEventListener('timeupdate', () => {
  if (!movil.matches) { rotulo.textContent = 'La sala'; return; }
  const texto = TOMAS.find(([hasta]) => videos[0].currentTime < hasta)[1];
  if (rotulo.textContent !== texto) rotulo.textContent = texto;
});

// Entrada: las pantallas se encienden y el título sube cuando ya está la tipografía
function listo() { hero.classList.add('is-listo'); }
if (html.classList.contains('fonts-ready')) listo();
else new MutationObserver((_, obs) => { if (html.classList.contains('fonts-ready')) { obs.disconnect(); listo(); } })
  .observe(html, { attributes: true, attributeFilter: ['class'] });

/* ── Muelle: el CTA fijo aparece después del hero y se esconde en la consulta y el pie ── */
const muelle = $('[data-muelle]');
const visibles = new Set();
const vigiaMuelle = new IntersectionObserver((entradas) => {
  entradas.forEach((en) => (en.isIntersecting ? visibles.add(en.target) : visibles.delete(en.target)));
  const mostrar = visibles.size === 0;
  muelle.classList.toggle('is-visible', mostrar);
  muelle.setAttribute('aria-hidden', String(!mostrar));
  $$('a', muelle).forEach((a) => (mostrar ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
}, { threshold: 0 });
[hero, $('#consulta'), $('.pie')].forEach((el) => vigiaMuelle.observe(el));

/* ── Año ── */
$('[data-anio]').textContent = new Date().getFullYear();

/* ── Consulta y galería ── */
iniciarConsulta({ irA });
iniciarGaleria();

/* ── Movimiento al hacer scroll ── */
if (!reducido) {
  const animar = () => {
    // Títulos de sección: suben por líneas, enmascarados; al terminar se deshace el corte
    // para que el texto vuelva a acomodarse solo si cambia el ancho.
    $$('[data-revelar]').forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(split.lines, {
        yPercent: 105, duration: 1.1, ease: 'power3.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onComplete: () => split.revert(),
      });
    });

    // Fotos y créditos: aparecen sin exagerar
    const aparecen = '.afiche, .espacio__foto, .espacio__detalle, .collage__item, .plato, .creditos__lista > div, .shows__tira li';
    gsap.set(aparecen, { autoAlpha: 0, y: 28 });
    ScrollTrigger.batch(aparecen, {
      start: 'top 92%',
      once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out', stagger: 0.08, overwrite: true }),
    });

    // La fachada del Astral se dibuja con el scroll
    const trazos = $$('.fachada path');
    gsap.fromTo(trazos, { '--trazo': 1 }, {
      '--trazo': 0, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: '.salon__fachada', start: 'top 82%', end: 'bottom 52%', scrub: 0.8 },
    });

    ScrollTrigger.refresh();
  };
  if (html.classList.contains('fonts-ready')) animar();
  else document.fonts.ready.then(() => requestAnimationFrame(animar));
}

// Las imágenes diferidas cambian la altura de la página: ScrollTrigger recalcula al terminar de cargar
window.addEventListener('load', () => ScrollTrigger.refresh());
