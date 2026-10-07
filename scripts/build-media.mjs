// Genera el material del sitio a partir de raw/ (publicaciones públicas de @laantonellaeventos).
//   node scripts/build-media.mjs          → fotos + videos
//   node scripts/build-media.mjs --img    → solo fotos
//   node scripts/build-media.mjs --video  → solo videos
// Salida: public/img/<nombre>-<ancho>.webp, public/video/*.mp4|webp y src/img-data.json
//
// Casi todas las fotos traen la marca de agua "La Antonella EVENTOS" centrada abajo:
// `cut` es la fracción inferior que se recorta para sacarla (0 = la foto no tiene marca).
import sharp from 'sharp';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';

const FF = ffmpeg.path;
const RAW = 'raw';
const OUT_IMG = 'public/img';
const OUT_VID = 'public/video';
const args = process.argv.slice(2);
const doImages = !args.includes('--video');
const doVideos = !args.includes('--img');
[OUT_IMG, OUT_VID].forEach((d) => mkdirSync(d, { recursive: true }));

const WM = 0.19; // marca de agua 2023-2026 (La Antonella EVENTOS / La An10nella AÑOS)
const WM_OLD = 0.2; // 2021-2022: banda oscura con "EL MOMENTO ES AHORA"

// nombre → { src: archivo en raw/, cut, top (fracción a recortar arriba), crop {left,top,width,height} en px }
const IMAGES = {
  // — El edificio: hall, sala, escenario, fachada —
  'hall-barra': { src: '0489_CpAhxntumn4_0.jpg', cut: WM },
  'hall-cupula': { src: '0724_CSxTsnzIF8S_0.jpg', cut: WM_OLD },
  'hall-llegada': { src: '0519_Cl_vmjNuMp-_0.jpg', cut: WM },
  'hall-quince': { src: '0549_CjGzJ1OO6iz_0.jpg', cut: WM },
  'hall-escalera': { src: '0722_CS-YJbHMvpu_0.jpg', cut: WM_OLD },
  'hall-malabares': { src: '0556_Cidhv5RODsf_0.jpg', cut: WM },
  'sala-calida': { src: '0233_DCj8pfapQ_I_0.jpg', cut: WM },
  'sala-violeta': { src: '0313_C6ZmFahp1tN_0.jpg', cut: WM },
  'sala-pista': { src: '0146_DMBaU87sVFq_0.jpg', cut: WM },
  'sala-brindis': { src: '0086_DSsNCqSjSZ4_0.jpg', cut: WM },
  'sala-mesas': { src: '0297_C79KLCks5YS_0.jpg', cut: WM },
  'sala-cena': { src: '0755_CPwOFG0nrts_0.jpg', cut: WM_OLD },
  'sala-mozo': { src: '0369_C1AdhuUxWZN_1.jpg', cut: 0.04 },
  'escenario-cartel': { src: '0074_DUGAPy9DbCP_0.jpg', cut: WM },
  'escenario-sillon': { src: '0097_DRj5DjQDj69_0.jpg', cut: WM },
  'escenario-boca': { src: '0902_BcaRXe2DZz3_1.jpg', cut: 0 },
  'escenario-boca-2019': { src: '0870_BwfvleuBUD5_0.jpg', cut: 0 },
  'neon-mesa': { src: '0274_C-f6k8nM2Se_0.jpg', cut: WM },
  'neon-cartel': { src: '0292_C8h41KIPZ7f_0.jpg', cut: WM },
  'fachada-noche': { src: '0088_DSf3YUeDjAs_0.jpg', cut: WM },
  'entrada-auto': { src: '0494_Coco321Oas-_0.jpg', cut: WM },
  'entrada-fuego': { src: '0299_C7y2_fppdYQ_0.jpg', cut: WM },
  'pantalla-lara': { src: '0459_Cr1HmhZOOrq_0.jpg', cut: WM },

  // — 15 años —
  'q-silueta': { src: '0007_DdR8a0ojP4k_0.jpg', cut: WM },
  'q-espalda': { src: '0101_DRNd85xAetQ_0.jpg', cut: WM },
  'q-padre': { src: '0106_DQPq3siEm-F_0.jpg', cut: WM },
  'q-chispas': { src: '0286_C9NhKZgPLz1_0.jpg', cut: WM },
  'q-letras': { src: '0025_DbG5fooHM96_0.jpg', cut: WM },
  'q-rosa': { src: '0167_DJei_w3IU2Q_0.jpg', cut: WM },
  'q-hall': { src: '0161_DKCmL6DyYz9_0.jpg', cut: WM },
  'q-roja': { src: '0276_C-SzmdcNvJu_0.jpg', cut: WM },
  'q-tiara': { src: '0128_DN1LMi4XkvW_0.jpg', cut: WM },
  'q-escenario': { src: '0022_DbY7DujkeAw_0.jpg', cut: WM },

  // — Casamientos —
  'b-hall': { src: '0017_DcWuIebDdNK_0.jpg', cut: WM },
  'b-hall-2': { src: '0151_DLAZMKdx7Kx_0.jpg', cut: WM },
  'b-entrada': { src: '0278_C-DUxkFIQ-m_0.jpg', cut: WM },
  'b-chispas': { src: '0437_CuADkiLOOSB_0.jpg', cut: WM },
  'b-civil': { src: '0048_DXsB-n8iOgo_0.jpg', cut: WM },
  'b-libreta': { src: '0019_DcOdCPKnMmF_0.jpg', cut: WM },
  'b-anillos': { src: '0005_DdcWdtPja4c_0.jpg', cut: WM },
  'b-fiesta': { src: '0042_DYQFDVFDNUP_0.jpg', cut: WM },
  'b-vals': { src: '0486_CpTLa4vOfKv_0.jpg', cut: WM },
  'b-ramo': { src: '0008_DdMy2gmjVlj_0.jpg', cut: WM },

  // — Egresados (solo publicaciones que lo dicen) —
  'e-promo': { src: '0061_DVZC6Xjgavw_0.jpg', cut: WM },
  'e-pareja': { src: '0067_DUvM9_viJ0Q_0.jpg', cut: WM },
  'e-escenario': { src: '0150_DLFizG-O7vn_0.jpg', cut: WM },
  'e-brindis': { src: '0145_DMIfdTFOF26_0.jpg', cut: WM },
  'e-letras': { src: '0525_Cld_8DeuNrg_1.jpg', cut: 0.03 },

  // — Pista —
  'pista-barras': { src: '0018_DcUJVwuATdA_0.jpg', cut: WM },
  'pista-neon': { src: '0079_DTV8E4hgeLD_0.jpg', cut: WM },
  'pista-robot': { src: '0083_DS-cVxGiIv1_0.jpg', cut: WM },

  // — Cumpleaños y sociales —
  'c-globos': { src: '0004_Ddj-A9_jvzA_0.jpg', cut: WM },
  'c-torta-50': { src: '0009_DdHiYP_jTqi_0.jpg', cut: WM },
  'c-velas': { src: '0110_DP4EQ0TjZQY_0.jpg', cut: WM },
  'c-55': { src: '0033_DZvWeqVAbPD_0.jpg', cut: WM },
  's-charla': { src: '0100_DRSFM9LDyyU_0.jpg', cut: WM },
  's-tragos': { src: '0058_DVtpRM2FzNS_0.jpg', cut: WM },

  // — Shows —
  'show-robot': { src: '0000_Dd7JJWlidt9_0.jpg', cut: WM },
  'show-robot-chispas': { src: '0032_DZ0gDSOgQ32_0.jpg', cut: WM },
  'show-robot-abuela': { src: '0043_DYIdkTHiHbD_0.jpg', cut: WM },
  'show-abba': { src: '0068_DUqX_ZHDBLg_0.jpg', cut: WM },
  'show-robot-rojo': { src: '0124_DOYealEj9Gr_0.jpg', cut: WM },
  'show-banda': { src: '0553_Civhpf5udg1_0.jpg', cut: WM },
  'show-magia': { src: '0568_ChZ6FvqOYwN_0.jpg', cut: WM },
  'show-dj': { src: '0543_CjvMOGdO0ne_0.jpg', cut: WM },
  'show-foto': { src: '0094_DR16m3QDYWM_0.jpg', cut: WM },

  // — Gastronomía —
  'g-copas': { src: '0041_DY-bY4hjW-H_0.jpg', cut: WM },
  'g-merengues': { src: '0020_DblXlgRke49_0.jpg', cut: WM },
  'g-tarta-firma': { src: '0050_DXfQz_TjNP-_0.jpg', cut: WM },
  'g-lemon': { src: '0089_DSatzHulAU2_0.jpg', cut: WM },
  'g-frutillas': { src: '0099_DRXBGQ9gRfG_0.jpg', cut: WM },
  'g-tartas': { src: '0341_C33dC8IpXHI_0.jpg', cut: WM },
  'g-canapes': { src: '0582_CgFbBjzOQy6_0.jpg', cut: WM_OLD },
  'g-torta-rosa': { src: '0003_DdpHkRolGyM_0.jpg', cut: WM },
  'g-torta-novios': { src: '0034_DZqGBAdgE_v_0.jpg', cut: WM },
  'g-torta-blanca': { src: '0070_DUeCVlDiIe8_0.jpg', cut: WM },
  'g-golosinas': { src: '0029_DavIp5ZChF8_0.jpg', cut: WM },
  'g-golosinas-rosa': { src: '0054_DWELZUukrHC_0.jpg', cut: WM },
  'g-frascos': { src: '0076_DT54WVhj4i-_0.jpg', cut: WM },
  'g-brindis': { src: '0184_DHWNQsPJBj0_0.jpg', cut: WM },
  'g-bandeja': { src: '0224_DDe4iuMKW7N_0.jpg', cut: WM },
  'g-cupcakes': { src: '0264_C_dtrljv0mC_1.jpg', cut: 0.06 },

  // — Ambientación —
  'a-letras-boda': { src: '0027_Da5zyUYjW7P_0.jpg', cut: WM },
  'a-letras-am': { src: '0149_DLKet2FuIJn_0.jpg', cut: WM },
  'a-lentejuelas': { src: '0144_DMN9vR5MVE3_0.jpg', cut: WM },
  'a-polaroids': { src: '0176_DIWcxToPmiJ_0.jpg', cut: WM },
  'a-flores': { src: '0002_DduRNBbDZDj_0.jpg', cut: WM },
  'a-lirios': { src: '0046_DX2VHmojHrr_0.jpg', cut: WM },
  'a-velas-azules': { src: '0087_DSne5jugfPr_0.jpg', cut: WM },
  'a-vasos': { src: '0036_DZdU61gAXbU_0.jpg', cut: WM },
  'a-mesa-larga': { src: '0507_CnPVJL_OXzO_0.jpg', cut: WM },
  'a-candelabro': { src: '0530_Ck_uCxzO7FL_0.jpg', cut: WM },
  'a-candelabro-violeta': { src: '0558_CiQEFyxObwX_0.jpg', cut: WM },
  'a-mesa-negra': { src: '0694_CVlfQhVlDGS_0.jpg', cut: WM_OLD },
  'a-mesa-violeta': { src: '0739_CRXL-NnLizX_0.jpg', cut: WM_OLD },
  'a-nombre': { src: '0264_C_dtrljv0mC_0.jpg', cut: WM },
};

const WIDTHS = [480, 800, 1200, 1600];

function run(argv) {
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: 'inherit' });
}

async function images() {
  const data = {};
  for (const [name, cfg] of Object.entries(IMAGES)) {
    const input = `${RAW}/${cfg.src}`;
    if (!existsSync(input)) throw new Error(`falta ${input}`);
    const meta0 = await sharp(input).metadata();
    let region = cfg.crop;
    if (!region) {
      const top = Math.round(meta0.height * (cfg.top ?? 0));
      const bottom = Math.round(meta0.height * (cfg.cut ?? 0));
      region = { left: 0, top, width: meta0.width, height: meta0.height - top - bottom };
    }
    const buf = await sharp(input).rotate().extract(region).toBuffer();
    const meta = await sharp(buf).metadata();
    const widths = WIDTHS.filter((w) => w < meta.width * 1.02);
    if (!widths.length || widths[widths.length - 1] < meta.width * 0.9) widths.push(meta.width);
    for (const w of widths) {
      await sharp(buf).resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 }).toFile(`${OUT_IMG}/${name}-${w}.webp`);
    }
    const { dominant } = await sharp(buf).stats();
    // Color de espera: el dominante oscurecido, para que el hueco no destaque sobre el fondo de la sala
    const dim = (v) => Math.round(v * 0.45).toString(16).padStart(2, '0');
    data[name] = { w: meta.width, h: meta.height, widths, color: `#${dim(dominant.r)}${dim(dominant.g)}${dim(dominant.b)}` };
  }
  // Limpia variantes viejas que ya no están en la lista
  for (const f of readdirSync(OUT_IMG)) {
    const name = f.replace(/-\d+\.webp$/, '');
    if (!data[name]) rmSync(`${OUT_IMG}/${f}`);
  }
  writeFileSync('src/img-data.json', JSON.stringify(data, null, 1));
  console.log('fotos', Object.keys(data).length);
}

// Tres tomas reales para las pantallas del hero (los reels son verticales 9:16).
const CLIPS = [
  // Sala violeta: lluvia de LEDs, bola de espejos y el cartel de neón del balcón.
  // Es un recorrido (720×1280) con subtítulos quemados a 2/3 de alto: se usa solo el 60% superior.
  { name: 'pantalla-sala', src: '0031_DaDObwNCv4a_0.mp4', ss: 84.4, t: 5.6, vf: 'crop=432:768:144:0,scale=540:960:flags=lanczos' },
  // Brindis de quince en el escenario, con chispas frías detrás.
  { name: 'pantalla-brindis', src: '0134_DNRPJY6t_s9_0.mp4', ss: 7.4, t: 5.6, vf: 'scale=540:960' },
  // Pista llena: manos arriba, luces de celulares y el balcón al fondo.
  { name: 'pantalla-pista', src: '0130_DNoaQoJqQRs_0.mp4', ss: 15.4, t: 5.6, vf: 'scale=540:960' },
];

async function videos() {
  const enc = ['-an', '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
  for (const c of CLIPS) {
    run(['-ss', String(c.ss), '-t', String(c.t), '-i', `${RAW}/${c.src}`, '-vf', `${c.vf},fps=30`, ...enc, `${OUT_VID}/${c.name}.mp4`]);
    run(['-ss', String(c.ss + 0.2), '-i', `${RAW}/${c.src}`, '-frames:v', '1', '-vf', c.vf, '-q:v', '2', `${OUT_VID}/${c.name}.jpg`]);
    await sharp(`${OUT_VID}/${c.name}.jpg`).webp({ quality: 72 }).toFile(`${OUT_VID}/${c.name}.webp`);
    rmSync(`${OUT_VID}/${c.name}.jpg`);
  }
  // Celular: una sola pantalla que encadena las tres tomas con fundidos.
  const inputs = CLIPS.flatMap((c) => ['-ss', String(c.ss), '-t', String(c.t), '-i', `${RAW}/${c.src}`]);
  const scaled = CLIPS.map((c, i) => `[${i}:v]${c.vf.replace('scale=540:960', 'scale=720:1280')},fps=30,settb=AVTB,setpts=PTS-STARTPTS[v${i}]`).join(';');
  const fade = 0.6;
  const off1 = CLIPS[0].t - fade;
  const off2 = off1 + CLIPS[1].t - fade;
  const graph = `${scaled};[v0][v1]xfade=transition=fade:duration=${fade}:offset=${off1}[x1];[x1][v2]xfade=transition=fade:duration=${fade}:offset=${off2}[out]`;
  run([...inputs, '-filter_complex', graph, '-map', '[out]', ...enc, `${OUT_VID}/pantalla-movil.mp4`]);
  console.log('videos ok');
}

if (doImages) await images();
if (doVideos) await videos();
