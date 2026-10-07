// Consulta en cinco pasos → una "entrada" con el resumen → mensaje armado para WhatsApp.
const WHATSAPP = '5493513263356';
const TOTAL = 5;

const fmtLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
// "viernes, 2 de octubre" → "viernes 2 de octubre", como se escribe acá
const fmtDia = { format: (d) => fmtLargo.format(d).replace(/^([^,\s]+),/, '$1') };
const fmtMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const mismoDia = (a, b) => a && b && a.getTime() === b.getTime();

export function iniciarConsulta({ irA } = {}) {
  const form = document.querySelector('[data-consulta]');
  if (!form) return;
  const $ = (s) => form.querySelector(s);
  const $$ = (s) => [...form.querySelectorAll(s)];

  const etapas = $$('[data-etapa]');
  const barra = $$('.boleteria__barra li');
  const pasoTexto = $('[data-paso-texto]');
  const btnSig = $('[data-siguiente]');
  const btnVolver = $('[data-volver]');
  const btnEnviar = $('[data-enviar]');
  const entrada = $('[data-entrada]');

  const estado = { paso: 0, fecha: null, vista: null };

  /* ── Navegación entre pasos ── */
  function mostrar(n, direccion = 1) {
    estado.paso = n;
    etapas.forEach((et, i) => {
      const activa = i === n;
      et.hidden = !activa;
      et.classList.toggle('is-activa', activa);
      et.classList.toggle('is-vuelve', activa && direccion < 0);
    });
    barra.forEach((li, i) => li.classList.toggle('is-hecho', i <= Math.min(n, TOTAL - 1)));
    pasoTexto.textContent = n < TOTAL ? `Paso ${n + 1} de ${TOTAL}` : 'Lista para enviar';
    btnVolver.hidden = n === 0;
    btnVolver.textContent = n === TOTAL ? 'Editar' : 'Volver';
    btnSig.hidden = n === TOTAL;
    btnSig.textContent = n === TOTAL - 1 ? 'Ver mi consulta' : 'Siguiente';
    btnEnviar.hidden = n !== TOTAL;
    if (n === TOTAL) armarEntrada();
    if (n === 1) pintarCalendario();
  }
  function enfocarPaso() {
    const et = etapas[estado.paso];
    const foco = et.querySelector('input:checked, [aria-pressed="true"], input:not([type=hidden]), textarea') || et;
    if (estado.paso === TOTAL) { et.focus({ preventScroll: true }); return; }
    foco.focus({ preventScroll: true });
  }
  btnSig.addEventListener('click', avanzar);
  btnVolver.addEventListener('click', () => { if (estado.paso > 0) { mostrar(estado.paso - 1, -1); encuadrar(); enfocarPaso(); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); avanzar(); });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])')) { e.preventDefault(); avanzar(); }
  });
  function avanzar() {
    if (!validar(estado.paso)) return;
    mostrar(estado.paso + 1, 1);
    encuadrar();
    enfocarPaso();
  }
  // Si la tarjeta quedó por encima de la pantalla, se vuelve a mostrar desde su borde superior
  function encuadrar() {
    const tope = form.getBoundingClientRect().top;
    const cabecera = document.querySelector('[data-cabecera]').offsetHeight;
    if (tope < cabecera && irA) irA(form);
  }

  function error(n, texto, campo) {
    const p = etapas[n].querySelector('[data-error]');
    if (p) p.textContent = texto || '';
    $$('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
    return !texto;
  }

  function validar(n) {
    const datos = new FormData(form);
    if (n === 0) {
      if (!datos.get('evento')) return error(0, 'Elegí qué vas a celebrar.');
      if (datos.get('evento') === 'Otro' && String(datos.get('eventoOtro')).trim().length < 2) {
        return error(0, 'Contanos qué evento es.', $('[name=eventoOtro]'));
      }
      return error(0, '');
    }
    if (n === 1) {
      if (!estado.fecha && !$('[data-sin-fecha]').checked) return error(1, 'Elegí un día en el calendario o marcá que todavía no tenés fecha.');
      return error(1, '');
    }
    if (n === 4) {
      const nombre = String(datos.get('nombre')).trim();
      const tel = String(datos.get('telefono')).replace(/\D/g, '');
      if (nombre.length < 2) return error(4, 'Escribí tu nombre.', $('[name=nombre]'));
      if (tel.length < 8) return error(4, 'Revisá el teléfono: tiene que tener al menos 8 números.', $('[name=telefono]'));
      return error(4, '');
    }
    return true;
  }

  /* ── Paso 1: evento ── */
  const otro = $('[data-otro]');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'evento') {
      otro.hidden = e.target.value !== 'Otro';
      error(0, '');
      filtrarExtras(e.target.value);
    }
  });
  function filtrarExtras(evento) {
    $$('[data-solo]').forEach((chip) => {
      const ver = chip.dataset.solo === evento;
      chip.hidden = !ver;
      if (!ver) chip.querySelector('input').checked = false;
    });
  }

  /* ── Paso 2: calendario ── */
  const cal = $('[data-calendario]');
  const calMes = $('[data-cal-mes]');
  const calDias = $('[data-cal-dias]');
  const calAnt = $('[data-cal-ant]');
  const calSig = $('[data-cal-sig]');
  const sinFecha = $('[data-sin-fecha]');
  const mesAprox = $('[data-mes-aprox]');
  const mesSelect = $('[data-mes-select]');
  const MESES_ADELANTE = 30;

  estado.vista = new Date(hoy().getFullYear(), hoy().getMonth(), 1);

  function pintarCalendario(enfocar) {
    const v = estado.vista;
    const minimo = new Date(hoy().getFullYear(), hoy().getMonth(), 1);
    const maximo = new Date(minimo.getFullYear(), minimo.getMonth() + MESES_ADELANTE, 1);
    calMes.textContent = fmtMes.format(v);
    calAnt.disabled = v <= minimo;
    calSig.disabled = v >= maximo;

    const primero = (new Date(v.getFullYear(), v.getMonth(), 1).getDay() + 6) % 7; // lunes = 0
    const dias = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
    const manana = new Date(hoy().getTime() + 864e5);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < primero; i++) {
      const vacio = document.createElement('span');
      vacio.setAttribute('aria-hidden', 'true');
      frag.append(vacio);
    }
    let tabulable = null;
    for (let d = 1; d <= dias; d++) {
      const fecha = new Date(v.getFullYear(), v.getMonth(), d);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dia';
      b.textContent = d;
      b.dataset.fecha = fecha.toISOString();
      b.setAttribute('aria-label', fmtDia.format(fecha));
      b.setAttribute('aria-pressed', String(mismoDia(fecha, estado.fecha)));
      b.tabIndex = -1;
      if (fecha < manana) b.disabled = true;
      if (mismoDia(fecha, hoy())) b.classList.add('is-hoy');
      if (!b.disabled && (mismoDia(fecha, estado.fecha) || (!tabulable && !estado.fecha))) tabulable = b;
      frag.append(b);
    }
    calDias.replaceChildren(frag);
    const elegido = calDias.querySelector('[aria-pressed="true"]');
    (elegido || tabulable || calDias.querySelector('.dia:not(:disabled)'))?.setAttribute('tabindex', '0');
    if (enfocar) calDias.querySelector('[tabindex="0"]')?.focus();
  }
  calAnt.addEventListener('click', () => { estado.vista.setMonth(estado.vista.getMonth() - 1); pintarCalendario(); });
  calSig.addEventListener('click', () => { estado.vista.setMonth(estado.vista.getMonth() + 1); pintarCalendario(); });
  calDias.addEventListener('click', (e) => {
    const b = e.target.closest('.dia');
    if (!b || b.disabled) return;
    estado.fecha = new Date(b.dataset.fecha);
    error(1, '');
    pintarCalendario();
    calDias.querySelector('[aria-pressed="true"]')?.focus();
  });
  calDias.addEventListener('keydown', (e) => {
    const mov = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!mov) return;
    e.preventDefault();
    const botones = [...calDias.querySelectorAll('.dia')];
    const i = botones.indexOf(document.activeElement);
    const destino = botones[i + mov];
    if (destino && !destino.disabled) {
      botones.forEach((b) => (b.tabIndex = -1));
      destino.tabIndex = 0;
      destino.focus();
    } else if (!destino) {
      // Salta de mes manteniendo la dirección
      estado.vista.setMonth(estado.vista.getMonth() + (mov > 0 ? 1 : -1));
      pintarCalendario(true);
    }
  });
  // Meses aproximados para quien todavía no tiene día
  const base = new Date(hoy().getFullYear(), hoy().getMonth(), 1);
  mesSelect.append(new Option('Todavía no sé', ''));
  for (let i = 0; i < 18; i++) {
    const m = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const texto = fmtMes.format(m);
    mesSelect.append(new Option(texto.charAt(0).toUpperCase() + texto.slice(1), texto));
  }
  sinFecha.addEventListener('change', () => {
    cal.classList.toggle('is-apagado', sinFecha.checked);
    mesAprox.hidden = !sinFecha.checked;
    if (sinFecha.checked) { estado.fecha = null; pintarCalendario(); error(1, ''); }
  });

  /* ── Paso 3: invitados ── */
  const rango = $('[data-invitados]');
  const salida = $('[data-invitados-num]');
  const nota = $('[data-invitados-nota]');
  const atajos = $$('[data-invitados-atajo]');
  function invitados() {
    const n = Number(rango.value);
    const max = rango.max === '600' && n >= 600;
    salida.textContent = max ? '600+' : n;
    rango.style.setProperty('--pct', `${((n - rango.min) / (rango.max - rango.min)) * 100}%`);
    rango.setAttribute('aria-valuetext', `${salida.textContent} invitados`);
    atajos.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.invitadosAtajo) === n)));
    nota.textContent = n < 120
      ? 'El salón trabaja desde 120 invitados: para grupos más chicos, consultá opciones.'
      : n > 500
        ? 'Más de 500 invitados: lo conversan directo con el salón.'
        : 'El salón recibe de 120 a 500 invitados.';
  }
  rango.addEventListener('input', invitados);
  atajos.forEach((b) => b.addEventListener('click', () => { rango.value = b.dataset.invitadosAtajo; invitados(); }));
  invitados();

  /* ── Resumen: la entrada ── */
  function textoFecha() {
    if (estado.fecha) return fmtDia.format(estado.fecha);
    const aprox = mesSelect.value;
    return aprox ? `A definir · aprox. ${aprox}` : 'A definir';
  }
  function leer() {
    const d = new FormData(form);
    const evento = d.get('evento') === 'Otro' ? String(d.get('eventoOtro')).trim() : d.get('evento');
    const n = Number(d.get('invitados'));
    return {
      evento,
      fecha: textoFecha(),
      invitados: n >= 600 ? 'Más de 600' : `${n} aprox.`,
      extras: d.getAll('extras'),
      observaciones: String(d.get('observaciones') || '').trim(),
      nombre: String(d.get('nombre')).trim(),
      telefono: String(d.get('telefono')).trim(),
      visita: d.get('visita') === 'on',
    };
  }
  function armarEntrada() {
    const c = leer();
    entrada.classList.remove('is-cortada');
    entrada.querySelector('[data-e-evento]').textContent = c.evento;
    entrada.querySelector('[data-e-fecha]').textContent = c.fecha.charAt(0).toUpperCase() + c.fecha.slice(1);
    entrada.querySelector('[data-e-invitados]').textContent = c.invitados;
    entrada.querySelector('[data-e-nombre]').textContent = c.nombre;
    entrada.querySelector('[data-e-telefono]').textContent = c.telefono;
    const extras = [...c.extras, c.visita ? 'Visita al salón' : ''].filter(Boolean);
    entrada.querySelector('[data-e-extras]').textContent = extras.length ? `Me interesa: ${extras.join(' · ')}` : '';
    btnEnviar.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje(c))}`;
  }
  function mensaje(c) {
    const lineas = [
      '¡Hola! Quiero consultar disponibilidad en La Antonella.',
      '',
      `• Evento: ${c.evento}`,
      `• Fecha: ${c.fecha}`,
      `• Invitados: ${c.invitados}`,
    ];
    if (c.extras.length) lineas.push(`• Me interesa: ${c.extras.join(', ')}`);
    if (c.visita) lineas.push('• Me gustaría coordinar una visita al salón.');
    if (c.observaciones) lineas.push(`• Comentarios: ${c.observaciones}`);
    lineas.push('', `Soy ${c.nombre} · Tel. ${c.telefono}`, 'Gracias.');
    return lineas.join('\n');
  }
  btnEnviar.addEventListener('click', () => {
    // El talón se corta mientras WhatsApp se abre en otra pestaña
    entrada.classList.add('is-cortada');
    etapas[TOTAL].querySelector('.etapa__nota').textContent = 'Se abrió WhatsApp con tu consulta. Si no lo ves, volvé a tocar el botón.';
  });

  /* ── Accesos desde la cartelera y la gastronomía ── */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#consulta"]');
    if (!a) return;
    if (a.dataset.evento) {
      const radio = form.querySelector(`input[name=evento][value="${CSS.escape(a.dataset.evento)}"]`);
      if (radio) {
        radio.checked = true;
        otro.hidden = true;
        filtrarExtras(radio.value);
        if (estado.paso === 0) mostrar(1);
      }
    }
    if (a.dataset.extra) {
      const chip = form.querySelector(`input[name=extras][value="${CSS.escape(a.dataset.extra)}"]`);
      if (chip) chip.checked = true;
    }
  });

  mostrar(0);
}
