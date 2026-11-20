// Neon Palms Cover Studio — cover engine and editor.
// Everything is drawn with canvas code: no borrowed artwork, no fonts to
// download, no network. Photos stay on the machine; export is a local PNG.

'use strict';

/* ------------------------------------------------------------------ state */

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const LAYOUT_PANELS = { duo: 2, trio: 3, quad: 4, stack: 4 };

const state = {
  layout: 'trio',
  grade: 'sunset',
  size: '1080x1080',
  title: 'NEON PALMS',
  subtitle: 'Sunset over Palm Coast',
  tag: 'PALM COAST • 2026',
  photos: [], // { name, source } — source is a canvas or an image
  panels: [], // { photo, zoom, ox, oy } — one per panel slot, max 4
  activePanel: 0,
};

function defaultPanel(i) {
  // Each panel starts cropped a little differently, so one photo already
  // reads as several scenes across the poster.
  const presets = [
    { photo: 0, zoom: 1.12, ox: 0, oy: 0 },
    { photo: 0, zoom: 1.6, ox: 25, oy: -15 },
    { photo: 0, zoom: 1.15, ox: -20, oy: -100 },
    { photo: 0, zoom: 1.3, ox: 20, oy: -80 },
  ];
  return { ...presets[i % presets.length] };
}

function resetPanels() {
  state.panels = [0, 1, 2, 3].map((i) => defaultPanel(i));
  if (state.activePanel >= LAYOUT_PANELS[state.layout]) state.activePanel = 0;
}

/* ------------------------------------------------------- deterministic rng */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------- procedural sample photograph */

/**
 * Paints the built-in sample scene — a sunset boulevard with palms, a
 * skyline and a convertible — onto ctx. It is drawn, not photographed, so
 * there is no consent or licensing question. Used as the default photo.
 */
function paintSampleBoulevard(ctx, w, h) {
  const rnd = mulberry32(20261120);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.42, '#c94b7c');
  sky.addColorStop(0.68, '#ff7a3d');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Low sun with a warm halo.
  const sunX = w * 0.62, sunY = h * 0.52, sunR = w * 0.11;
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  halo.addColorStop(0, 'rgba(255, 214, 102, 0.85)');
  halo.addColorStop(1, 'rgba(255, 214, 102, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

  // Soft clouds.
  ctx.fillStyle = 'rgba(255, 190, 200, 0.35)';
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * w, cy = h * (0.08 + rnd() * 0.3), cw = w * (0.10 + rnd() * 0.16);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant skyline, hazed by the sunset.
  drawSkyline(ctx, 0, h * 0.62, w, h * 0.16, 'rgba(74, 28, 84, 0.85)', mulberry32(77));

  // Road running to the horizon, with dashes.
  ctx.fillStyle = '#241533';
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.78); ctx.lineTo(w * 0.66, h * 0.78);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 5; i++) {
    const t = i / 5, y = h * (0.80 + t * 0.19), s = w * (0.004 + t * 0.012);
    ctx.fillRect(w / 2 - s / 2, y, s, h * 0.028);
  }

  // Palm silhouettes framing the street.
  drawPalm(ctx, w * 0.10, h * 0.86, h * 0.42, '#1d0b2e');
  drawPalm(ctx, w * 0.92, h * 0.90, h * 0.48, '#1d0b2e');
  drawPalm(ctx, w * 0.30, h * 0.80, h * 0.22, 'rgba(29, 11, 46, 0.9)');

  // A convertible cruising down the boulevard.
  drawConvertible(ctx, w * 0.52, h * 0.86, w * 0.34, '#c2255c');

  // Birds.
  ctx.strokeStyle = 'rgba(43, 16, 85, 0.9)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  for (let i = 0; i < 4; i++) {
    const bx = w * (0.2 + i * 0.12), by = h * (0.16 + (i % 2) * 0.07), s = w * 0.02;
    ctx.beginPath();
    ctx.moveTo(bx - s, by); ctx.quadraticCurveTo(bx - s / 2, by - s * 0.7, bx, by);
    ctx.quadraticCurveTo(bx + s / 2, by - s * 0.7, bx + s, by);
    ctx.stroke();
  }
}

/** A palm tree silhouette: one curved trunk and a crown of drooping fronds. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round';
  const topX = x + s * 0.16, topY = y - s;
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.02, y - s * 0.55, topX, topY); ctx.stroke();
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 38) * Math.PI / 180;
    const tipX = topX + Math.cos(a) * s * 0.52;
    const tipY = topY + Math.sin(a) * s * 0.42 + s * 0.22;
    const midX = topX + Math.cos(a) * s * 0.3;
    const midY = topY + Math.sin(a) * s * 0.1 - s * 0.06;
    ctx.beginPath(); ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(topX - s * 0.03, topY + s * 0.02, s * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(topX + s * 0.04, topY + s * 0.03, s * 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** A flat city skyline with lit windows, drawn from a seeded random. */
function drawSkyline(ctx, x, baseY, w, h, color, rnd) {
  ctx.save();
  ctx.fillStyle = color;
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.05 + rnd() * 0.07);
    const bh = h * (0.35 + rnd() * 0.65);
    ctx.fillRect(bx, baseY - bh, bw, bh);
    if (rnd() > 0.6) ctx.fillRect(bx + bw * 0.4, baseY - bh - h * 0.18, bw * 0.2, h * 0.18);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.75)';
    for (let wy = baseY - bh + h * 0.08; wy < baseY - h * 0.05; wy += h * 0.12) {
      for (let wx = bx + bw * 0.14; wx < bx + bw * 0.86; wx += bw * 0.28) {
        if (rnd() > 0.55) ctx.fillRect(wx, wy, bw * 0.1, h * 0.05);
      }
    }
    ctx.fillStyle = color;
    bx += bw + w * 0.008;
  }
  ctx.restore();
}

/** A low convertible silhouette, side view, facing left. */
function drawConvertible(ctx, cx, cy, w, color) {
  const h = w * 0.32;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx - w / 2, cy - h * 0.42);
  ctx.quadraticCurveTo(cx - w * 0.42, cy - h * 0.62, cx - w * 0.18, cy - h * 0.66);
  ctx.lineTo(cx + w * 0.12, cy - h * 0.66);
  ctx.quadraticCurveTo(cx + w * 0.38, cy - h * 0.6, cx + w * 0.48, cy - h * 0.3);
  ctx.lineTo(cx + w / 2, cy - h * 0.18);
  ctx.lineTo(cx + w / 2, cy);
  ctx.closePath(); ctx.fill();
  // Open top and windshield.
  ctx.fillStyle = 'rgba(20, 9, 31, 0.9)';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.16, cy - h * 0.62);
  ctx.lineTo(cx + w * 0.10, cy - h * 0.62);
  ctx.lineTo(cx + w * 0.20, cy - h * 0.30);
  ctx.lineTo(cx - w * 0.16, cy - h * 0.30);
  ctx.closePath(); ctx.fill();
  // Wheels.
  ctx.fillStyle = '#14091f';
  for (const wx of [cx - w * 0.30, cx + w * 0.30]) {
    ctx.beginPath(); ctx.arc(wx, cy, h * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(wx, cy, h * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#14091f';
  }
  ctx.restore();
}

/* ------------------------------------------------------------ colour grades */

const GRADES = {
  sunset: {
    skyTop: '#2b1055', skyMid: '#c94b7c', skyBot: '#ff9a3d',
    wash: 'rgba(255, 110, 60, 0.20)', washMode: 'overlay',
    bandA: '#ff2e88', bandB: '#ff7a3d', bandInk: '#ffffff',
    subInk: '#ffd166', sun: '#ffd166',
  },
  neon: {
    skyTop: '#070b2a', skyMid: '#3b0f6e', skyBot: '#12041f',
    wash: 'rgba(10, 255, 239, 0.16)', washMode: 'overlay',
    bandA: '#0affef', bandB: '#ff2ea6', bandInk: '#ffffff',
    subInk: '#0affef', sun: '#ff2ea6',
  },
  pastel: {
    skyTop: '#8ec9ee', skyMid: '#ffc7dd', skyBot: '#ffe9a8',
    wash: 'rgba(255, 255, 255, 0.10)', washMode: 'soft-light',
    bandA: '#ff8fb8', bandB: '#7fd4ff', bandInk: '#ffffff',
    subInk: '#5b2a86', sun: '#fff3b0',
  },
};

/* ----------------------------------------------------------------- layouts */

/** Panel rectangles for a layout, in cover pixels, with white gutters. */
function layoutPanels(name, W, H) {
  const g = Math.round(W * 0.018); // gutter
  const inset = Math.round(W * 0.02);
  const x0 = inset, y0 = inset, w0 = W - inset * 2, h0 = H - inset * 2;
  if (name === 'duo') {
    const wA = Math.round(w0 * 0.52);
    return [
      { x: x0, y: y0, w: wA, h: h0 },
      { x: x0 + wA + g, y: y0, w: w0 - wA - g, h: h0 },
    ];
  }
  if (name === 'trio') {
    const hA = Math.round(h0 * 0.60);
    const wA = Math.round((w0 - g) / 2);
    return [
      { x: x0, y: y0, w: w0, h: hA },
      { x: x0, y: y0 + hA + g, w: wA, h: h0 - hA - g },
      { x: x0 + wA + g, y: y0 + hA + g, w: wA, h: h0 - hA - g },
    ];
  }
  if (name === 'stack') {
    const wA = Math.round(w0 * 0.38);
    const hA = Math.round((h0 - g * 2) / 3);
    return [
      { x: x0, y: y0, w: wA, h: h0 },
      { x: x0 + wA + g, y: y0, w: w0 - wA - g, h: hA },
      { x: x0 + wA + g, y: y0 + hA + g, w: w0 - wA - g, h: hA },
      { x: x0 + wA + g, y: y0 + (hA + g) * 2, w: w0 - wA - g, h: hA },
    ];
  }
  // quad — a 2 x 2 grid.
  const wA = Math.round((w0 - g) / 2), hA = Math.round((h0 - g) / 2);
  return [
    { x: x0, y: y0, w: wA, h: hA },
    { x: x0 + wA + g, y: y0, w: wA, h: hA },
    { x: x0, y: y0 + hA + g, w: wA, h: hA },
    { x: x0 + wA + g, y: y0 + hA + g, w: wA, h: hA },
  ];
}

/* -------------------------------------------------------------- panel photo */

/** Draws one photo into a panel rect: cover-fit, zoom, pan, grade wash. */
function drawPanelPhoto(ctx, rect, photo, panel, grade) {
  const src = photo.source;
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (!sw || !sh) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();

  const base = Math.max(rect.w / sw, rect.h / sh);
  const dw = sw * base * panel.zoom;
  const dh = sh * base * panel.zoom;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox / 100) * rect.w * 0.3;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy / 100) * rect.h * 0.3;
  ctx.drawImage(src, dx, dy, dw, dh);

  // Colour grade: a soft wash, then a warm-to-cool gradient from the top.
  ctx.globalCompositeOperation = grade.washMode;
  ctx.fillStyle = grade.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  const sheen = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sheen.addColorStop(0, 'rgba(255, 122, 61, 0.10)');
  sheen.addColorStop(0.6, 'rgba(255, 122, 61, 0)');
  sheen.addColorStop(1, 'rgba(43, 16, 85, 0.16)');
  ctx.fillStyle = sheen;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // Keyline and a soft inner shadow so panels read as separate plates.
  ctx.strokeStyle = 'rgba(20, 9, 31, 0.85)';
  ctx.lineWidth = Math.max(2, rect.w * 0.006);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/* -------------------------------------------------------------- title block */

/** The slanted title band, subtitle and tag — the poster's lettering. */
function drawTitleBlock(ctx, W, H, grade) {
  const bandH = H * 0.19;
  const bandY = H * 0.78;
  const titlePx = Math.round(W * 0.082);
  const subPx = Math.round(W * 0.032);

  ctx.save();
  ctx.translate(W / 2, bandY + bandH / 2);
  ctx.rotate(-0.035);
  const band = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
  band.addColorStop(0, grade.bandA);
  band.addColorStop(1, grade.bandB);
  ctx.fillStyle = band;
  ctx.fillRect(-W * 0.56, -bandH / 2, W * 1.12, bandH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(-W * 0.56, -bandH / 2, W * 1.12, Math.max(2, bandH * 0.06));
  ctx.restore();

  // Big title, heavy, with a dark outline so it pops off any photo.
  ctx.save();
  ctx.translate(W / 2, bandY + bandH / 2);
  ctx.rotate(-0.035);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = (state.title || 'NEON PALMS').toUpperCase();
  ctx.font = `900 ${titlePx}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(1, titlePx * 0.02)}px`; } catch (e) { /* older canvas: no letter spacing */ }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20, 9, 31, 0.9)';
  ctx.lineWidth = Math.max(3, titlePx * 0.09);
  ctx.strokeText(title, 0, -subPx * 0.45);
  ctx.fillStyle = grade.bandInk;
  ctx.fillText(title, 0, -subPx * 0.45);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  // Script-style subtitle under the title.
  ctx.font = `italic 700 ${subPx}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = grade.subInk;
  ctx.fillText(state.subtitle || '', 0, titlePx * 0.45);
  ctx.restore();

  // Small tag pill, top left, and a star badge, top right.
  const pillH = Math.round(H * 0.045);
  ctx.save();
  ctx.font = `700 ${Math.round(pillH * 0.42)}px "Helvetica Neue", Arial, sans-serif`;
  const tagW = ctx.measureText(state.tag || '').width + pillH * 1.4;
  ctx.fillStyle = 'rgba(20, 9, 31, 0.78)';
  roundRect(ctx, W * 0.02, H * 0.02, tagW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(state.tag || '', W * 0.02 + tagW / 2, H * 0.02 + pillH / 2 + 1);
  ctx.restore();

  const badgeR = Math.round(W * 0.045);
  const bx = W - W * 0.02 - badgeR, by = H * 0.02 + badgeR;
  ctx.save();
  ctx.fillStyle = grade.sun;
  ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(20, 9, 31, 0.85)';
  ctx.lineWidth = Math.max(2, badgeR * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#14091f';
  ctx.font = `900 ${Math.round(badgeR * 0.95)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', bx, by + badgeR * 0.06);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ------------------------------------------------------------ grain + frame */

function addGrainAndVignette(ctx, W, H) {
  const rnd = mulberry32(7);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let i = 0; i < 500; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(10, 4, 20, 0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ------------------------------------------------------------ the renderer */

/**
 * Renders the whole cover onto any canvas at its own size. The same
 * function paints the live preview and the exported PNG, so what you see
 * is exactly what you share.
 */
function renderCover(canvas, st) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[st.grade] || GRADES.sunset;

  // Sky backdrop: the gutters and the frame show the grade.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // A low sun glowing behind the panels.
  const sunX = W * 0.82, sunY = H * 0.30, sunR = W * 0.13;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Palm silhouettes peeking over the top edge.
  drawPalm(ctx, W * 0.06, H * 0.10, H * 0.16, 'rgba(20, 9, 31, 0.85)');
  drawPalm(ctx, W * 0.95, H * 0.08, H * 0.13, 'rgba(20, 9, 31, 0.85)');

  // Panels.
  const rects = layoutPanels(st.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = st.panels[i] || defaultPanel(i);
    const photo = st.photos[panel.photo] || st.photos[0];
    if (photo) drawPanelPhoto(ctx, rect, photo, panel, grade);
  });

  drawTitleBlock(ctx, W, H, grade);
  addGrainAndVignette(ctx, W, H);

  // Thin white poster frame.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, W * 0.006);
  ctx.strokeRect(W * 0.008, H * 0.008, W * 0.984, H * 0.984);
  return ctx;
}

/**
 * Exports the cover at one of the post sizes as a PNG blob.
 * Resolves { blob, width, height } — the PNG is exactly the named size.
 */
function exportCoverPNG(sizeName) {
  const dims = SIZES[sizeName] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = dims[0];
  canvas.height = dims[1];
  renderCover(canvas, state);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve({ blob, width: dims[0], height: dims[1] });
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}

/* ------------------------------------------------------------------- editor */

const previewCanvas = document.getElementById('previewCanvas');
const $ = (id) => document.getElementById(id);

function previewSize() {
  const dims = SIZES[state.size];
  const scale = 640 / dims[0];
  previewCanvas.width = 640;
  previewCanvas.height = Math.round(dims[1] * scale);
}

function refreshPreview() {
  previewSize();
  renderCover(previewCanvas, state);
  syncPanelControls();
}

/** Builds the built-in sample photo on a canvas and loads it as photo 0. */
function loadSamplePhoto() {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  paintSampleBoulevard(canvas.getContext('2d'), 1200, 900);
  state.photos = [{ name: 'Sample boulevard', source: canvas }];
  state.panels.forEach((p) => { p.photo = 0; });
  renderThumbs();
  refreshPreview();
}

function addPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
    if (state.photos.length >= 4) { reject(new Error('Four photos at most')); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.photos.push({ name: file.name, source: img });
        renderThumbs();
        refreshPreview();
        resolve(img);
      };
      img.onerror = () => reject(new Error('Could not read that image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function renderThumbs() {
  const box = $('photoThumbs');
  box.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb' + (state.panels[state.activePanel] && state.panels[state.activePanel].photo === i ? ' is-active' : '');
    btn.title = `Use “${photo.name}” for the tuned panel`;
    const thumb = document.createElement('canvas');
    thumb.width = 64; thumb.height = 64;
    const tctx = thumb.getContext('2d');
    const sw = photo.source.naturalWidth || photo.source.width;
    const sh = photo.source.naturalHeight || photo.source.height;
    const s = Math.max(64 / sw, 64 / sh);
    tctx.drawImage(photo.source, (64 - sw * s) / 2, (64 - sh * s) / 2, sw * s, sh * s);
    const label = document.createElement('span');
    label.textContent = photo.name.length > 12 ? photo.name.slice(0, 11) + '…' : photo.name;
    btn.appendChild(thumb);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.panels[state.activePanel].photo = i;
      renderThumbs();
      refreshPreview();
    });
    box.appendChild(btn);
  });
}

function renderPanelTabs() {
  const box = $('panelTabs');
  box.innerHTML = '';
  const count = LAYOUT_PANELS[state.layout];
  for (let i = 0; i < count; i++) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'panel-tab' + (i === state.activePanel ? ' is-active' : '');
    tab.textContent = `Panel ${i + 1}`;
    tab.addEventListener('click', () => { state.activePanel = i; renderPanelTabs(); refreshPreview(); });
    box.appendChild(tab);
  }
}

function syncPanelControls() {
  renderPanelTabs();
  const panel = state.panels[state.activePanel] || defaultPanel(0);
  const select = $('panelPhotoSelect');
  select.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1} · ${photo.name}`;
    select.appendChild(opt);
  });
  select.value = String(panel.photo || 0);
  $('zoomInput').value = String(panel.zoom);
  $('zoomOut').textContent = `${panel.zoom.toFixed(2)}×`;
  $('panXInput').value = String(panel.ox);
  $('panXOut').textContent = String(panel.ox);
  $('panYInput').value = String(panel.oy);
  $('panYOut').textContent = String(panel.oy);
}

function bindChipGroup(selector, attr, apply) {
  document.querySelectorAll(selector).forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      apply(chip.dataset[attr]);
      refreshPreview();
    });
  });
}

function bindControls() {
  $('photoInput').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    (async () => {
      for (const f of files) { try { await addPhotoFile(f); } catch (err) { /* keep the rest */ } }
    })();
    e.target.value = '';
  });
  $('sampleBtn').addEventListener('click', loadSamplePhoto);
  $('fillAllBtn').addEventListener('click', () => {
    state.panels.forEach((p) => { p.photo = 0; });
    renderThumbs();
    refreshPreview();
  });

  bindChipGroup('.layout-chip', 'layout', (v) => {
    state.layout = v;
    if (state.activePanel >= LAYOUT_PANELS[v]) state.activePanel = 0;
  });
  bindChipGroup('.grade-chip', 'grade', (v) => { state.grade = v; });
  bindChipGroup('.size-chip', 'size', (v) => { state.size = v; });

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; refreshPreview(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; refreshPreview(); });
  $('tagInput').addEventListener('input', (e) => { state.tag = e.target.value; refreshPreview(); });

  $('panelPhotoSelect').addEventListener('change', (e) => {
    state.panels[state.activePanel].photo = Number(e.target.value);
    renderThumbs();
    refreshPreview();
  });
  $('zoomInput').addEventListener('input', (e) => {
    state.panels[state.activePanel].zoom = Number(e.target.value);
    $('zoomOut').textContent = `${Number(e.target.value).toFixed(2)}×`;
    refreshPreview();
  });
  $('panXInput').addEventListener('input', (e) => {
    state.panels[state.activePanel].ox = Number(e.target.value);
    $('panXOut').textContent = e.target.value;
    refreshPreview();
  });
  $('panYInput').addEventListener('input', (e) => {
    state.panels[state.activePanel].oy = Number(e.target.value);
    $('panYOut').textContent = e.target.value;
    refreshPreview();
  });

  // Drag & drop photos onto the preview.
  const zone = $('dropZone');
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => {
    e.preventDefault();
    zone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => {
    e.preventDefault();
    zone.classList.remove('dragging');
  }));
  zone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    (async () => {
      for (const f of files) { try { await addPhotoFile(f); } catch (err) { /* keep the rest */ } }
    })();
  });

  // Drag on the preview to pan the tuned panel's photo.
  let dragging = null;
  previewCanvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, y: e.clientY };
    previewCanvas.setPointerCapture(e.pointerId);
  });
  previewCanvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = previewCanvas.getBoundingClientRect();
    const panel = state.panels[state.activePanel];
    panel.ox += ((e.clientX - dragging.x) / rect.width) * 220;
    panel.oy += ((e.clientY - dragging.y) / rect.height) * 220;
    panel.ox = Math.max(-100, Math.min(100, panel.ox));
    panel.oy = Math.max(-100, Math.min(100, panel.oy));
    dragging = { x: e.clientX, y: e.clientY };
    refreshPreview();
  });
  const endDrag = () => { dragging = null; };
  previewCanvas.addEventListener('pointerup', endDrag);
  previewCanvas.addEventListener('pointercancel', endDrag);

  $('exportBtn').addEventListener('click', async () => {
    const btn = $('exportBtn');
    btn.disabled = true;
    btn.textContent = 'Rendering…';
    try {
      const { blob } = await exportCoverPNG(state.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neon-palms-cover-${state.size}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Export PNG ↓';
    }
  });
}

/* --------------------------------------------------------------------- init */

resetPanels();
bindControls();
loadSamplePhoto();

// Test hook: the same functions the buttons use, so an automated check can
// drive the app exactly as a person would.
window.NeonPalms = { state, SIZES, renderCover, exportCoverPNG, paintSampleBoulevard, loadSamplePhoto };
