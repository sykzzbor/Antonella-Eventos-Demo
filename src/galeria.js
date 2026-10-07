// Galería "Funciones anteriores": filtros por tipo de evento y visor con teclado y gesto.
export function iniciarGaleria() {
  const galeria = document.querySelector('[data-galeria]');
  const visor = document.querySelector('[data-visor]');
  if (!galeria || !visor) return;

  const figuras = [...galeria.querySelectorAll('figure')];
  const filtros = [...document.querySelectorAll('[data-filtro]')];
  const img = visor.querySelector('[data-visor-img]');
  const pie = visor.querySelector('[data-visor-pie]');
  let actual = 0;
  let disparador = null;

  /* ── Filtros ── */
  filtros.forEach((btn) => btn.addEventListener('click', () => {
    const cat = btn.dataset.filtro;
    filtros.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    figuras.forEach((f) => {
      const ver = cat === 'todas' || f.dataset.cat === cat;
      const estaba = !f.classList.contains('is-oculta');
      f.classList.toggle('is-oculta', !ver);
      f.classList.remove('is-entra');
      if (ver && !estaba) { void f.offsetWidth; f.classList.add('is-entra'); }
    });
  }));

  /* ── Visor ── */
  const visibles = () => figuras.filter((f) => !f.classList.contains('is-oculta'));
  const fuenteGrande = (el) => {
    const opciones = (el.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(' ')[0]).filter(Boolean);
    return opciones[opciones.length - 1] || el.currentSrc || el.src;
  };
  function mostrar(i) {
    const lista = visibles();
    actual = (i + lista.length) % lista.length;
    const fig = lista[actual];
    const fuente = fig.querySelector('img');
    img.src = fuente.currentSrc || fuente.src; // lo ya cargado primero, sin hueco
    img.alt = fuente.alt;
    const grande = fuenteGrande(fuente);
    if (grande && grande !== img.src) {
      const pre = new Image();
      pre.onload = () => { if (lista[actual] === fig) img.src = grande; };
      pre.src = grande;
    }
    pie.textContent = `${fig.querySelector('figcaption').textContent} — ${actual + 1} de ${lista.length}`;
  }
  galeria.addEventListener('click', (e) => {
    const btn = e.target.closest('.galeria__foto');
    if (!btn) return;
    disparador = btn;
    mostrar(visibles().indexOf(btn.closest('figure')));
    visor.showModal();
    document.dispatchEvent(new CustomEvent('bloqueo', { detail: true }));
  });
  visor.addEventListener('close', () => {
    document.dispatchEvent(new CustomEvent('bloqueo', { detail: false }));
    disparador?.focus({ preventScroll: true });
  });
  visor.querySelector('[data-visor-cerrar]').addEventListener('click', () => visor.close());
  visor.querySelector('[data-visor-ant]').addEventListener('click', () => mostrar(actual - 1));
  visor.querySelector('[data-visor-sig]').addEventListener('click', () => mostrar(actual + 1));
  visor.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(actual - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(actual + 1); }
  });
  // Clic en el fondo cierra
  visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });

  // Deslizar para pasar de foto en pantallas táctiles
  let x0 = null;
  visor.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  visor.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) mostrar(actual + (dx < 0 ? 1 : -1));
  });
}
