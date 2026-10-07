// Favicon (fachada del Astral en oro sobre la sala) y tarjeta para compartir (OG 1200×630).
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const ORO = '#d9b06a', SALA = '#0c0a0d', MARFIL = '#f2eadc';
const fachada = readFileSync('src/brand/fachada.svg', 'utf8');
const inner = fachada.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${SALA}"/><g transform="translate(13 9) scale(0.19)" fill="none" stroke="${ORO}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${inner.replace(/pathLength="1"\s*/g, '')}</g></svg>`);

const logo = readFileSync('src/brand/logo.svg', 'utf8').replace(/currentColor/g, ORO).replace('<svg ', '<svg width="460" ');
const foto = await sharp('public/img/escenario-cartel-1080.webp').resize(560, 630, { fit: 'cover', position: 'centre' }).modulate({ brightness: 0.85 }).toBuffer();
const texto = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="630"><text x="80" y="470" font-family="Georgia, serif" font-size="40" fill="${MARFIL}">Fue cine. Hoy es tu noche.</text><text x="80" y="520" font-family="Arial, sans-serif" font-size="18" letter-spacing="4" fill="${ORO}">ALTA CÓRDOBA · EX CINE ASTRAL</text></svg>`);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: SALA } })
  .composite([
    { input: foto, left: 640, top: 0 },
    { input: await sharp(Buffer.from(logo)).png().toBuffer(), left: 80, top: 170 },
    { input: texto, left: 0, top: 0 },
  ])
  .jpeg({ quality: 84 }).toFile('public/og.jpg');
console.log('ok');
