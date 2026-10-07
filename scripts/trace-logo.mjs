// Vectoriza el logotipo "La Antonella / EVENTOS" desde la marca de agua blanca de una foto
// oscura (post DdR8a0ojP4k, 1638×2048) con potrace.
// Salida: src/brand/logo.svg (completo), logo-script.svg y logo-eventos.svg, todos en currentColor.
import sharp from 'sharp';
import potrace from 'potrace';
import { writeFileSync } from 'node:fs';

const SRC = 'raw/0007_DdR8a0ojP4k_0.jpg';
const SCALE = 5;
const PARTS = {
  script: { left: 575, top: 1675, width: 490, height: 113 },
  eventos: { left: 575, top: 1788, width: 490, height: 52 },
};

const trace = (buf) => new Promise((ok, ko) => potrace.trace(buf, {
  threshold: 128, turdSize: 900, optTolerance: 0.35, alphaMax: 1.1, color: 'currentColor', background: 'transparent',
}, (err, svg) => (err ? ko(err) : ok(svg))));

// Redondea coordenadas (el lienzo está ampliado ×5, el entero alcanza) y compacta el path
const compact = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(+n))).replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').trim();

async function part({ left, top, width, height }) {
  const buf = await sharp(SRC).extract({ left, top, width, height })
    .resize(width * SCALE, height * SCALE, { kernel: 'lanczos3' })
    .greyscale().blur(1.1).normalise().threshold(118).negate().png().toBuffer();
  const svg = await trace(buf);
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => compact(m[1])).join(' ');
  // Caja real de la tinta (píxeles oscuros) para un viewBox ajustado
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < 128) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const pad = 6;
  return { d, box: [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2], offsetY: top - PARTS.script.top };
}

const script = await part(PARTS.script);
const eventos = await part(PARTS.eventos);
const svgOf = (d, [x, y, w, h], extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"${extra}><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>`;

writeFileSync('src/brand/logo-script.svg', svgOf(script.d, script.box));
writeFileSync('src/brand/logo-eventos.svg', svgOf(eventos.d, eventos.box));

// Completo: EVENTOS desplazado a su lugar original debajo del script
const dy = eventos.offsetY * SCALE;
const [sx, sy, sw, sh] = script.box;
const [ex, ey, ew, eh] = eventos.box;
const minX = Math.min(sx, ex), maxX = Math.max(sx + sw, ex + ew);
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${sy} ${maxX - minX} ${ey + dy + eh - sy}"><path fill="currentColor" fill-rule="evenodd" d="${script.d}"/><path fill="currentColor" fill-rule="evenodd" transform="translate(0 ${dy})" d="${eventos.d}"/></svg>`;
writeFileSync('src/brand/logo.svg', full);
console.log('script', script.box, script.d.length, '· eventos', eventos.box, eventos.d.length);
