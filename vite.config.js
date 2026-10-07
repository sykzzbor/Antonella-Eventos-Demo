import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Convierte un SVG de src/brand en <symbol> para reusarlo con <use href="#id">.
function symbol(id, file) {
  const svg = readFileSync(file, 'utf8');
  const open = /<svg\b[^>]*>/.exec(svg)[0];
  const viewBox = /viewBox="([^"]+)"/.exec(open)[1];
  const keep = (open.match(/\s(?:fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/g) || []).join('');
  const inner = svg.slice(svg.indexOf(open) + open.length).replace(/<\/svg>\s*$/, '');
  return `<symbol id="${id}" viewBox="${viewBox}"${keep}>${inner}</symbol>`;
}

// <img data-img="nombre" data-sizes="..." alt="..."> → src, srcset, sizes, width, height y lazy.
// Los anchos salen de src/img-data.json (lo genera scripts/build-media.mjs).
// <!--brand--> → sprite con el logotipo y la fachada del ex Cine Astral.
function siteMarkup() {
  return {
    name: 'site-markup',
    transformIndexHtml(html) {
      const data = JSON.parse(readFileSync('src/img-data.json', 'utf8'));
      const sprite = [
        symbol('logo', 'src/brand/logo.svg'),
        symbol('logo-script', 'src/brand/logo-script.svg'),
        symbol('logo-eventos', 'src/brand/logo-eventos.svg'),
      ].join('');
      html = html.replace('<!--brand-->', `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${sprite}</svg>`);
      // La fachada va en línea (no como <use>) para poder animar cada trazo
      html = html.replace(/<!--fachada(?::([\w-]+))?-->/g, (_, cls) => {
        const svg = readFileSync('src/brand/fachada.svg', 'utf8').trim();
        return svg.replace('<svg ', `<svg class="${cls || 'fachada'}" aria-hidden="true" focusable="false" `);
      });
      return html.replace(/<img\b([^>]*?)\sdata-img="([^"]+)"([^>]*)>/g, (tag, before, name, after) => {
        const info = data[name];
        if (!info) throw new Error(`Imagen desconocida: ${name}`);
        const attrs = `${before}${after}`;
        const sizes = /data-sizes="([^"]+)"/.exec(attrs)?.[1] ?? '100vw';
        const eager = /\sdata-eager\b/.test(attrs);
        const rest = attrs.replace(/\s?data-sizes="[^"]+"/, '').replace(/\s?data-eager\b/, '');
        const mid = info.widths[Math.min(1, info.widths.length - 1)];
        const srcset = info.widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');
        const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
        return `<img${rest} src="/img/${name}-${mid}.webp" srcset="${srcset}" sizes="${sizes}" width="${info.w}" height="${info.h}" ${loading} decoding="async" style="--ph:${info.color}">`;
      });
    },
  };
}

export default defineConfig({
  plugins: [siteMarkup()],
  server: { host: true },
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
