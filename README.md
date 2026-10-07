# La Antonella Eventos — demo web

Sitio de una página para [@laantonellaeventos](https://www.instagram.com/laantonellaeventos/) (Alta Córdoba). Vite + HTML/CSS/JS, GSAP (ScrollTrigger, SplitText) y Lenis.

```bash
npm install
npm run dev      # desarrollo
npm run build    # genera /dist listo para publicar
npm run media    # regenera fotos y videos desde raw/
```

## La idea: función privada

El salón funciona en el edificio del **ex Cine Astral** (Jerónimo Luis de Cabrera 565). La web usa el lenguaje del cine sin disfrazarse:

- **Hero**: tres pantallas verticales con tomas reales (la sala violeta con la bola de espejos y el neón, un brindis con chispas frías, la pista). En celular y tablet, una sola pantalla que encadena las tres. Botón para pausar.
- **Cartelera**: cada tipo de evento es un afiche con su "bloque de créditos" (todo publicado por el salón). Cada afiche preselecciona el evento en la consulta.
- **Un salón con historia**: la fachada art déco que La Antonella proyecta en su pantalla, redibujada en SVG, se traza con el scroll. Recorrido hall → sala → escenario con imagen fija.
- **Créditos**: los servicios incluidos, armados como los créditos finales de una película.
- **Consulta**: cinco pasos (evento, fecha con calendario propio, invitados, extras, datos) que terminan en una *entrada* y abren WhatsApp con el mensaje completo.

## Identidad

- Logotipo: vectorizado de la marca de agua de sus fotos (`scripts/trace-logo.mjs` → `src/brand/`).
- Colores: negro ciruela de sala `#0c0a0d`, marfil `#f2eadc`, oro de marquesina `#d9b06a`.
- Tipografías: Imbue (didona condensada, de afiche) + Mona Sans (texto y créditos), autoalojadas (OFL).

## Datos (nada inventado)

Todo sale de publicaciones de la cuenta (se revisaron las 1.118):

- Capacidad 120 a 500 personas, parking, catering, sonido, iluminación y decoración: posts de may-2024 y dic-2024. *Un gráfico de 2022 decía 350 personas: conviene confirmar.*
- Lista de servicios (personal, seguridad de vehículos, climatización, cobertura médica, grupo electrógeno 85 kVA, sillas Royal, mesa dulce, torta de dos pisos, fin de fiesta): posts de 2021-2022 para fiestas de 15.
- Ex Cine Astral: gráfico propio de 2017 ("Bº Cofico – Ex cine Astral"), hashtags #teatroastral de 2016 y [Infonegocios, 2008](https://infonegocios.info/y-ademas/voodoo-lounge-resucita-los-fantasmas-del-cine-astral).
- Décimo aniversario: posts de 2022-2023. "A 5 minutos del centro": gráfico de 2022.
- WhatsApp +54 9 351 326-3356 (enlace de la bio). Sin precios ni testimonios.

## Material

Fotos y videos de publicaciones públicas (originales en `raw/`). `scripts/build-media.mjs` recorta la marca de agua, genera WebP responsivos y los clips del hero (el reel del recorrido tiene subtítulos quemados: se usa solo la franja superior).

## Antes de publicar

- Confirmar con el salón el uso de las fotos (aparecen clientes) y la capacidad vigente.
- Hoy el sitio tiene `noindex` por ser demo.
