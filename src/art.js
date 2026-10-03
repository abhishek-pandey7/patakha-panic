import { LEVELS } from './levels.js';

const W = 1440;
const H = 810;
const GROUND = 650;
const LAUNCH = { x: 235, y: 450 };
const GOLD = '#ffce76';
const PINK = '#ff789c';
const COLORS = ['#ffcc78', '#ff719a', '#6cedcc', '#a899ff', '#8ed8ff'];
const CRACKER_RECTS = {
  rocket: [40, 200, 650, 345], sutli: [790, 105, 400, 530],
  chakri: [75, 650, 510, 525], ladi: [610, 750, 630, 410],
};

const atlas = typeof Image !== 'undefined' ? new Image() : null;
export const crackerAtlasReady = atlas ? new Promise(resolve => { atlas.onload = resolve; atlas.onerror = resolve; }) : Promise.resolve();
if (atlas) atlas.src = `${import.meta.env?.BASE_URL || '/'}assets/crackers-reference.png`;

function rounded(ctx, x, y, w, h, r = 8) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}
function line(ctx, color, width, points) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}
function rand(min, max) { return min + Math.random() * (max - min); }
function seeded(seed) { const s = Math.sin(seed * 154.51 + 27.7) * 43578.89; return s - Math.floor(s); }

/** Uses the four supplied cracker illustrations directly, preserving their original pixel art. */
export function drawCracker(ctx, type, x, y, size, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  if (atlas?.complete && atlas.naturalWidth) {
    const [sx, sy, sw, sh] = CRACKER_RECTS[type] || CRACKER_RECTS.rocket;
    const fit = size / Math.max(sw, sh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, sx, sy, sw, sh, -sw * fit / 2, -sh * fit / 2, sw * fit, sh * fit);
  } else {
    ctx.strokeStyle = '#ffeabb'; ctx.lineWidth = Math.max(2, size / 15);
    if (type === 'rocket') {
      ctx.fillStyle = '#fb355b'; rounded(ctx, -size * .38, -size * .15, size * .65, size * .3, 3); ctx.fill();
      ctx.fillStyle = '#ffdc50'; ctx.beginPath(); ctx.moveTo(size * .46, 0); ctx.lineTo(size * .23, -size * .22); ctx.lineTo(size * .23, size * .22); ctx.fill();
    } else if (type === 'ladi') {
      line(ctx, '#e8b56b', size / 14, [[-size * .4, -size * .2], [0, 0], [size * .4, -size * .2]]);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ff3e68'; rounded(ctx, -size * .42 + i * size * .17, -size * .02, size * .13, size * .36, 2); ctx.fill(); }
    } else {
      ctx.fillStyle = type === 'sutli' ? '#149d63' : '#15aed1'; ctx.beginPath(); ctx.arc(0, 0, size * .34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = type === 'sutli' ? '#f5bd68' : '#ffe250'; ctx.lineWidth = size / 12; ctx.stroke();
      line(ctx, '#fbd79c', size / 15, [[size * .1, -size * .3], [size * .2, -size * .44], [0, -size * .49]]);
    }
  }
  ctx.restore();
}

function diya(ctx, x, y, size = 1, time = 0, bright = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  const glow = ctx.createRadialGradient(0, -7, 0, 0, -7, bright ? 33 : 25);
  glow.addColorStop(0, 'rgba(255,201,98,.28)'); glow.addColorStop(1, 'rgba(255,170,65,0)');
  ctx.fillStyle = glow; ctx.fillRect(-35, -40, 70, 60);
  ctx.fillStyle = '#c96b4b'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#ffc27a'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
  const flicker = Math.sin(time * .007 + x) * 1.4;
  ctx.fillStyle = '#ffbf43'; ctx.beginPath(); ctx.moveTo(0, -17 + flicker); ctx.bezierCurveTo(-8, -8, -5, -3, 0, -3); ctx.bezierCurveTo(5, -4, 6, -9, 0, -17 + flicker); ctx.fill();
  ctx.fillStyle = '#fff6d3'; ctx.beginPath(); ctx.ellipse(0, -6, 2, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function kandil(ctx, x, y, color, size = 1, time = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(time * .0007 + x) * .045); ctx.scale(size, size);
  line(ctx, '#bf9380', 1.2, [[0, -48], [0, -15]]);
  ctx.shadowColor = color; ctx.shadowBlur = 13; ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(14, -4); ctx.lineTo(10, 15); ctx.lineTo(-10, 15); ctx.lineTo(-14, -4); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; line(ctx, '#ffe8b2', 1.3, [[0, -20], [-6, -4], [0, 15], [6, -4], [0, -20]]);
  line(ctx, '#ffe8b2', 1, [[-14, -4], [14, -4]]);
  for (let i = -2; i <= 2; i++) line(ctx, color, 2, [[i * 4, 15], [i * 4 + Math.sin(time * .002 + i) * 2, 40 + Math.abs(i) * 2]]);
  ctx.restore();
}

export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.time = 0;
    this.effects = []; this.rings = []; this.popups = []; this.trail = []; this.backgroundFireworks = [];
    this.shake = 0; this.cameraX = 0; this.cameraY = 0; this.cameraZoom = 1; this.nextFirework = 350;
    this.celebration = 0; this.viewport = { scale: 1, offsetX: 0, offsetY: 0, width: W, height: H };
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || W; const height = rect.height || H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr); this.canvas.height = Math.round(height * this.dpr);
    const scale = Math.min(width / W, height / H);
    this.viewport = { scale, offsetX: (width - W * scale) / 2, offsetY: (height - H * scale) / 2, width, height };
  }

  toWorld(clientX, clientY) {
    const box = this.canvas.getBoundingClientRect(); const v = this.viewport;
    return { x: (clientX - box.left - v.offsetX) / v.scale + this.cameraX, y: (clientY - box.top - v.offsetY) / v.scale };
  }

  addEffect(event) {
    const x = Number.isFinite(event.x) ? event.x : 990; const y = Number.isFinite(event.y) ? event.y : 460;
    if (event.type === 'explosion') {
      const radius = event.radius || 100; this.shake = Math.max(this.shake, Math.min(13, radius / 18));
      this.rings.push({ x, y, radius, age: 0, life: 530, color: event.cracker === 'chakri' ? '#5ce5e3' : GOLD });
      for (let i = 0; i < Math.min(56, radius / 3 + 17); i++) {
        const angle = Math.random() * Math.PI * 2; const speed = rand(2, 8);
        this.effects.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life: rand(480, 1100), age: 0, size: rand(2, 6), color: COLORS[i % COLORS.length], spark: i % 3 === 0 });
      }
      for (let i = 0; i < 7; i++) this.effects.push({ x: x + rand(-20, 20), y: y + rand(-15, 15), vx: rand(-1, 1), vy: rand(-2, -.5), life: 1300, age: 0, size: rand(15, 30), color: '#cfb4be', smoke: true });
    }
    if (event.type === 'damage') {
      for (let i = 0; i < 5; i++) this.effects.push({ x, y, vx: rand(-3, 3), vy: rand(-5, 0), size: rand(2, 5), age: 0, life: rand(450, 850), color: event.color || '#eeb3a0', rubble: true });
    }
    if (event.type === 'ability') {
      for (let i = 0; i < 22; i++) this.effects.push({ x, y, vx: rand(-6, 0), vy: rand(-2, 2), size: rand(2, 5), age: 0, life: 500, color: COLORS[i % 3], spark: true });
      this.popups.push({ text: event.message || 'BOOST!', x, y: y - 38, age: 0, life: 1250, color: '#f9d389' });
    }
    if (event.type === 'combo') this.popups.push({ text: event.message || `Dhamaka x${event.combo || 3}!`, x, y: y - 35, age: 0, life: 1700, color: '#f9cc78' });
    if (event.type === 'win') this.popups.push({ text: 'Full paisa vasool!', x: 1015, y: 250, age: 0, life: 2700, color: '#f9d389' });
  }

  celebrate() { this.celebration = 6500; for (let i = 0; i < 5; i++) this.firework(rand(150, 1280), rand(130, 350), true); }

  firework(x, y, big = false) {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.backgroundFireworks.push({ x, y, color, age: 0, life: big ? 2400 : 1900, rays: big ? 30 : 18, radius: big ? rand(65, 120) : rand(32, 66), big });
  }

  render(state, dtMs = 16.67) {
    const ctx = this.ctx; const dt = Math.min(dtMs, 50); this.time += dt;
    this.celebration = Math.max(0, this.celebration - dt); this.nextFirework -= dt;
    if (this.nextFirework < 0) { this.firework(rand(150, 1320), rand(95, 360), this.celebration > 0); this.nextFirework = this.celebration > 0 ? rand(180, 420) : rand(1600, 2600); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const v = this.viewport; ctx.setTransform(this.dpr * v.scale, 0, 0, this.dpr * v.scale, this.dpr * v.offsetX, this.dpr * v.offsetY);
    this.drawSky(ctx, dt); this.drawCity(ctx); this.drawStrings(ctx);
    const phy = state.physics || {}; const projectile = phy.projectile;
    const follow = projectile && (phy.status === 'flight' || phy.status === 'settling');
    const desiredX = follow ? Math.max(0, Math.min(16, (projectile.position.x - 520) * .022)) : 0;
    this.cameraX += (desiredX - this.cameraX) * .04; this.shake *= .88;
    ctx.save(); ctx.translate(-this.cameraX + rand(-this.shake, this.shake), rand(-this.shake * .6, this.shake * .6));
    const showcase = state.mode === 'start' ? LEVELS[3] : null;
    this.drawGround(ctx);
    if (!showcase) this.drawLauncherBuilding(ctx);
    const bodies = showcase ? showcase.pieces.map(piece => ({ position: piece, angle: 0, plugin: { piece, health: 100, maxHealth: 100, destroyed: false } })) : phy.bodies || [];
    const obstacles = showcase ? [] : phy.obstacles || [];
    if (obstacles.length) obstacles.forEach(body => this.drawPiece(ctx, body));
    else if (!showcase && state.level?.obstacles) state.level.obstacles.forEach(piece => this.drawPiece(ctx, { position: piece, angle: 0, plugin: { piece, health: 100, maxHealth: 100, obstacle: true } }));
    if (bodies.length) bodies.forEach(body => this.drawPiece(ctx, body));
    else if (state.level?.pieces) state.level.pieces.forEach(piece => this.drawPiece(ctx, { position: piece, angle: 0, plugin: { piece, health: 100, maxHealth: 100, destroyed: false } }));
    if (!showcase) this.drawLauncher(ctx, state.aim, state.selected || 'rocket', phy);
    if (state.aim) this.drawAim(ctx, state.aim);
    if (projectile) this.drawProjectile(ctx, projectile, dt);
    else this.trail.length = 0;
    this.drawEffects(ctx, dt); ctx.restore();
    this.drawVignette(ctx);
  }

  drawSky(ctx, dt) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 650);
    gradient.addColorStop(0, 'rgba(7,15,39,.28)'); gradient.addColorStop(.5, 'rgba(10,20,50,.22)'); gradient.addColorStop(1, 'rgba(13,22,49,.68)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 45; i++) {
      const x = seeded(i + 6) * W; const y = 110 + seeded(i + 300) * 360;
      const alpha = .16 + (Math.sin(this.time * .0015 + i * 3) + 1) * .12;
      ctx.fillStyle = `rgba(255,227,180,${alpha})`; ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 1.5 : .8, 0, Math.PI * 2); ctx.fill();
    }
    this.backgroundFireworks = this.backgroundFireworks.filter(f => f.age < f.life);
    this.backgroundFireworks.forEach(f => {
      f.age += dt; const progress = f.age / f.life; const radius = f.radius * Math.min(1, progress * 3.2);
      ctx.save(); ctx.globalAlpha = (1 - progress) * (f.big ? .8 : .38); ctx.strokeStyle = f.color; ctx.lineWidth = f.big ? 2.3 : 1.4; ctx.lineCap = 'round';
      for (let i = 0; i < f.rays; i++) {
        const angle = i / f.rays * Math.PI * 2; const inner = radius * .72;
        ctx.beginPath(); ctx.moveTo(f.x + Math.cos(angle) * inner, f.y + Math.sin(angle) * inner + progress * progress * 35);
        ctx.lineTo(f.x + Math.cos(angle) * radius, f.y + Math.sin(angle) * radius + progress * progress * 35); ctx.stroke();
        ctx.fillStyle = '#ffe5bb'; ctx.beginPath(); ctx.arc(f.x + Math.cos(angle) * radius, f.y + Math.sin(angle) * radius + progress * progress * 35, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    for (let i = 0; i < 3; i++) {
      const x = ((this.time * .012 + i * 550) % 1850) - 180;
      const haze = ctx.createRadialGradient(x, 405 + i * 26, 10, x, 410 + i * 26, 170);
      haze.addColorStop(0, 'rgba(181,169,197,.045)'); haze.addColorStop(1, 'rgba(181,169,197,0)');
      ctx.fillStyle = haze; ctx.fillRect(x - 180, 240, 360, 320);
    }
  }

  drawCity(ctx) {
    const rows = [
      { base: 654, count: 21, width: 75, color: '#243a5d', alpha: .47, height: 95, spread: 155 },
      { base: 658, count: 14, width: 108, color: '#304768', alpha: .56, height: 55, spread: 135 },
    ];
    rows.forEach((row, ri) => {
      ctx.save(); ctx.globalAlpha = row.alpha;
      for (let i = 0; i < row.count; i++) {
        const x = i * row.width - 35; const width = row.width - 7; const height = row.height + seeded(i + ri * 50) * row.spread; const top = row.base - height;
        ctx.fillStyle = row.color; rounded(ctx, x, top, width, height + 14, 3); ctx.fill();
        ctx.fillStyle = '#3e5470'; ctx.fillRect(x - 3, top, width + 6, 5);
        for (let wy = top + 17; wy < row.base - 15; wy += 29) for (let wx = x + 12; wx < x + width - 12; wx += 22) {
          const lit = seeded(i * 103 + wy + wx) > .33;
          ctx.fillStyle = lit ? `rgba(255,208,119,${.28 + .12 * Math.sin(this.time * .0006 + wx)})` : '#172841';
          ctx.fillRect(wx, wy, 8, 12);
        }
        if (i % 3 === 0) { ctx.fillStyle = '#233651'; rounded(ctx, x + width * .35, top - 20, 24, 20, 4); ctx.fill(); ctx.fillRect(x + width * .35 - 2, top - 21, 28, 3); }
        if (i % 5 === 2) { ctx.strokeStyle = '#3e5370'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + width / 2, top + 4, width * .25, Math.PI, 0); ctx.fill(); ctx.stroke(); }
      }
      ctx.restore();
    });
  }

  drawStrings(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(235,198,157,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-20, 95); ctx.quadraticCurveTo(440, 238, 820, 118); ctx.quadraticCurveTo(1150, 235, 1470, 96); ctx.stroke();
    for (let i = 0; i < 39; i++) {
      const x = i * 39 - 15;
      const t = x < 820 ? (x + 20) / 840 : (x - 820) / 650;
      const y = x < 820 ? (1 - t) ** 2 * 95 + 2 * (1 - t) * t * 238 + t * t * 118 : (1 - t) ** 2 * 118 + 2 * (1 - t) * t * 235 + t * t * 96;
      const color = COLORS[i % COLORS.length]; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8 + Math.sin(this.time * .003 + i) * 3;
      ctx.beginPath(); ctx.ellipse(x, y + 4, 2.5, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    kandil(ctx, 67, 211, '#f1a555', .9, this.time); kandil(ctx, 613, 218, '#ea789a', .75, this.time); kandil(ctx, 1345, 219, '#71cdb8', .92, this.time);
    ctx.restore();
  }

  drawGround(ctx) {
    const grad = ctx.createLinearGradient(0, GROUND, 0, H);
    grad.addColorStop(0, '#29384e'); grad.addColorStop(.08, '#182438'); grad.addColorStop(1, '#111a30');
    ctx.fillStyle = grad; ctx.fillRect(-30, GROUND, W + 60, H - GROUND);
    ctx.fillStyle = '#586075'; ctx.fillRect(-30, GROUND, W + 60, 5);
    ctx.fillStyle = '#141c30'; ctx.fillRect(-30, GROUND + 5, W + 60, 6);
    ctx.strokeStyle = 'rgba(121,135,156,.11)'; ctx.lineWidth = 1;
    for (let x = -80; x < W + 80; x += 110) line(ctx, 'rgba(121,135,156,.11)', 1, [[x, 650], [x - 65, 810]]);
    line(ctx, 'rgba(121,135,156,.11)', 1, [[0, 702], [W, 702]]);
    line(ctx, 'rgba(121,135,156,.07)', 1, [[0, 780], [W, 780]]);
    for (let x = 55; x < 1410; x += 76) diya(ctx, x, 670, .65, this.time);
    ctx.save(); ctx.globalAlpha = .12; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
    const x = 565, y = 715;
    for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate(i * Math.PI / 6); ctx.beginPath(); ctx.ellipse(0, 16, 6, 15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  drawLauncherBuilding(ctx) {
    ctx.save();
    const wall = ctx.createLinearGradient(80, 488, 375, 650); wall.addColorStop(0, '#356f78'); wall.addColorStop(1, '#234954');
    ctx.fillStyle = wall; rounded(ctx, 75, 487, 320, 163, 4); ctx.fill();
    ctx.fillStyle = '#21434f'; ctx.fillRect(75, 634, 320, 16);
    ctx.fillStyle = '#63ada4'; rounded(ctx, 60, 480, 351, 16, 3); ctx.fill();
    ctx.fillStyle = '#285b63'; ctx.fillRect(60, 489, 351, 7);
    ctx.strokeStyle = 'rgba(132,209,192,.13)'; ctx.lineWidth = 2;
    for (let y = 518; y < 650; y += 29) { line(ctx, 'rgba(132,209,192,.13)', 1, [[77, y], [393, y]]); for (let x = 90 + ((y - 518) / 29 % 2) * 40; x < 392; x += 81) line(ctx, 'rgba(132,209,192,.13)', 1, [[x, y], [x, y + 29]]); }
    [130, 265].forEach((x, i) => {
      ctx.fillStyle = '#132d43'; rounded(ctx, x, 525, 70, 88, 11); ctx.fill();
      const glow = ctx.createLinearGradient(x, 525, x, 610); glow.addColorStop(0, '#ffc577'); glow.addColorStop(1, '#d98c51');
      ctx.fillStyle = glow; rounded(ctx, x + 7, 532, 56, 74, 7); ctx.fill();
      ctx.fillStyle = '#365c62'; ctx.fillRect(x + 31, 532, 7, 74); ctx.fillRect(x + 7, 568, 56, 6);
      ctx.fillStyle = '#1f444d'; rounded(ctx, x - 7, 602, 84, 10, 3); ctx.fill();
      ctx.fillStyle = '#e88676'; ctx.fillRect(x - 2, 534, 9, 57); ctx.fillRect(x + 63, 534, 9, 57);
      if (i === 0) kandil(ctx, x - 31, 545, '#ffc064', .65, this.time);
    });
    ctx.fillStyle = '#173b49'; rounded(ctx, 87, 450, 47, 31, 5); ctx.fill();
    ctx.fillStyle = '#4a8490'; ctx.fillRect(84, 447, 53, 7); ctx.fillRect(99, 457, 25, 2); ctx.fillRect(99, 464, 25, 2);
    // A small flowering terrace pot, garlands and lamps make the safe launcher rooftop distinct.
    ctx.fillStyle = '#c16c57'; ctx.beginPath(); ctx.moveTo(347, 480); ctx.lineTo(340, 456); ctx.lineTo(370, 456); ctx.lineTo(363, 480); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#5c9b72'; ctx.beginPath(); ctx.ellipse(353 + i * 2, 450 - i * 3, 4, 12, (i - 2) * .4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#efb65e'; [345, 356, 365].forEach((x, i) => { ctx.beginPath(); ctx.arc(x, 435 + i * 3, 5, 0, Math.PI * 2); ctx.fill(); });
    line(ctx, '#d68752', 3, [[60, 498], [146, 515], [234, 499], [320, 515], [411, 498]]);
    for (let i = 0; i < 22; i++) { const x = 60 + i * 16; const y = 499 + Math.abs(Math.sin(i / 5.3 * Math.PI)) * 13; ctx.fillStyle = i % 2 ? '#f2b557' : '#e78642'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    [151, 303, 393].forEach(x => diya(ctx, x, 477, .8, this.time));
    ctx.restore();
  }

  drawPiece(ctx, body) {
    const data = body.plugin || {}; const piece = data.piece || data.original || {}; const pos = body.position || piece;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    const w = piece.w || body.bounds?.max.x - body.bounds?.min.x || 40; const h = piece.h || body.bounds?.max.y - body.bounds?.min.y || 40;
    if (pos.y > 850 || pos.x < -200 || pos.x > 1640) return;
    ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(body.angle || 0);
    const destroyed = !!data.destroyed; const health = data.maxHealth ? Math.max(0, data.health / data.maxHealth) : 1;
    ctx.globalAlpha = destroyed ? .6 : 1;
    ctx.shadowColor = 'rgba(4,10,28,.45)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 3;
    const x = -w / 2, y = -h / 2; const mat = piece.material;
    if (piece.kind === 'obstacle') {
      // A festive stone gateway deliberately interrupts a straight shot in the final puzzles.
      ctx.fillStyle = '#bd9171'; rounded(ctx, x, y, w, h, 3); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#e2b789'; ctx.fillRect(x + 3, y + 3, 5, h - 6);
      for (let yy = y + 24; yy < y + h; yy += 25) line(ctx, '#946e59', 1.1, [[x + 2, yy], [x + w - 2, yy]]);
      ctx.fillStyle = '#e4bc8f'; rounded(ctx, x - 6, y - 6, w + 12, 13, 3); ctx.fill();
      ctx.fillStyle = '#ab8163'; ctx.fillRect(x - 4, y + h - 13, w + 8, 13);
      ctx.fillStyle = '#805c51'; rounded(ctx, -12, y + 21, 24, 41, 10); ctx.fill();
      ctx.fillStyle = '#d3a570'; rounded(ctx, -8, y + 25, 16, 32, 7); ctx.fill();
      ctx.fillStyle = '#f2ca79'; ctx.beginPath(); ctx.arc(0, y + 41, 4, 0, Math.PI * 2); ctx.fill();
      line(ctx, '#dd9551', 3, [[x - 2, y + 77], [0, y + 85], [x + w + 2, y + 77]]);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#f0b350' : '#e58445'; ctx.beginPath(); ctx.arc(x + i * w / 6, y + 79 + Math.sin(i / 6 * Math.PI) * 6, 3.3, 0, Math.PI * 2); ctx.fill(); }
      diya(ctx, 0, y - 8, .8, this.time);
    } else if (piece.kind === 'tank' || mat === 'metal') {
      ctx.fillStyle = piece.color || '#5b8097'; rounded(ctx, x, y, w, h, 8); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#3b5970'; rounded(ctx, x - 2, y - 1, w + 4, 8, 3); ctx.fill();
      ctx.fillStyle = '#729cb0'; ctx.fillRect(x + 6, y + 10, w - 12, 3); ctx.fillRect(x + 6, y + 20, w - 12, 3); ctx.fillRect(x + 6, y + 30, w - 12, 3);
      ctx.fillStyle = '#213b51'; ctx.fillRect(-8, y - 6, 16, 6); ctx.fillStyle = '#91b4c4'; ctx.fillRect(x + 5, y + 5, 4, h - 12);
    } else if (mat === 'wood') {
      ctx.fillStyle = piece.kind === 'support' ? '#b47d52' : '#cc9565'; rounded(ctx, x, y, w, h, 3); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#edbc87'; ctx.fillRect(x + 2, y + 2, w - 4, Math.min(3, h / 5));
      ctx.strokeStyle = '#774c3e'; ctx.lineWidth = 1.3;
      if (w > h) { for (let yy = y + 6; yy < y + h; yy += 5) line(ctx, 'rgba(122,74,52,.65)', 1, [[x + 8, yy], [x + w - 8, yy + Math.sin(yy)]]); }
      else { for (let xx = x + 5; xx < x + w; xx += 6) line(ctx, 'rgba(122,74,52,.6)', 1.2, [[xx, y + 10], [xx - 1, y + h - 10]]); }
      ctx.fillStyle = '#6f483d'; [[x + 5, y + 5], [x + w - 5, y + h - 5]].forEach(([xx, yy]) => { ctx.beginPath(); ctx.arc(xx, yy, 1.6, 0, Math.PI * 2); ctx.fill(); });
      if (piece.weak && piece.kind === 'support' && !destroyed) {
        ctx.fillStyle = '#f9d07b'; ctx.fillRect(x - 2, -12, w + 4, 24);
        ctx.save(); rounded(ctx, x - 2, -12, w + 4, 24, 0); ctx.clip();
        for (let i = -3; i < 5; i++) line(ctx, '#79503b', 4, [[x - 8 + i * 10, 12], [x + 5 + i * 10, -12]]); ctx.restore();
        const pulse = .45 + Math.sin(this.time * .004 + pos.x) * .15;
        ctx.strokeStyle = `rgba(255,213,126,${pulse})`; ctx.lineWidth = 1.8; rounded(ctx, x - 4, y - 3, w + 8, h + 6, 5); ctx.stroke();
      }
    } else {
      const color = mat === 'concrete' ? '#91a2b5' : piece.color || '#ef9dba';
      ctx.fillStyle = color; rounded(ctx, x, y, w, h, piece.kind === 'wall' ? 3 : 2); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.fillStyle = mat === 'concrete' ? '#bec8d3' : 'rgba(255,224,208,.32)'; ctx.fillRect(x + 2, y + 2, w - 4, 3);
      ctx.fillStyle = mat === 'concrete' ? '#687b91' : 'rgba(94,37,67,.27)'; ctx.fillRect(x + 2, y + h - 4, w - 4, 4);
      if (piece.kind === 'wall') {
        ctx.strokeStyle = mat === 'concrete' ? 'rgba(53,76,105,.2)' : 'rgba(110,60,84,.23)'; ctx.lineWidth = .8;
        for (let row = 0; row < 3; row++) { const yy = y + 15 * (row + 1); if (yy < y + h - 4) line(ctx, ctx.strokeStyle, .8, [[x + 2, yy], [x + w - 2, yy]]); for (let xx = x + ((row % 2) * 14); xx < x + w; xx += 29) line(ctx, ctx.strokeStyle, .8, [[xx, yy - 15], [xx, yy]]); }
        // Each wall carries one inset glowing window; independent slabs and pillars stay legible.
        const winW = Math.min(28, w * .36), winH = Math.min(30, h - 12);
        ctx.fillStyle = '#253146'; rounded(ctx, -winW / 2 - 3, -winH / 2 - 3, winW + 6, winH + 6, 5); ctx.fill();
        const glow = ctx.createLinearGradient(0, -winH / 2, 0, winH / 2); glow.addColorStop(0, '#ffdd8b'); glow.addColorStop(1, '#eca359');
        ctx.fillStyle = destroyed ? '#af916a' : glow; rounded(ctx, -winW / 2, -winH / 2, winW, winH, 3); ctx.fill();
        ctx.fillStyle = '#735248'; ctx.fillRect(-1.5, -winH / 2, 3, winH); ctx.fillRect(-winW / 2, 0, winW, 2);
        ctx.fillStyle = '#546172'; ctx.fillRect(-winW / 2 - 7, winH / 2 + 1, winW + 14, 5);
      }
      if (piece.kind === 'roof' && !destroyed) {
        line(ctx, '#374151', 1.3, [[x + 5, y - 6], [x + w - 5, y - 6]]);
        for (let i = 0; i < Math.floor(w / 21); i++) { const xx = x + 10 + i * 21; ctx.fillStyle = COLORS[(i + (piece.group || 0)) % COLORS.length]; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(xx, y - 5, 2.2, 0, Math.PI * 2); ctx.fill(); }
        ctx.shadowBlur = 0;
      }
    }
    if (health < .72 || destroyed) {
      ctx.strokeStyle = mat === 'concrete' ? '#4d6279' : '#754b59'; ctx.lineWidth = 1.7;
      line(ctx, ctx.strokeStyle, 1.7, [[-w * .35, -h * .4], [-w * .1, -h * .04], [-w * .16, h * .15], [w * .09, h * .45]]);
      if (health < .35) line(ctx, ctx.strokeStyle, 1.3, [[w * .3, -h * .4], [w * .18, -h * .15], [w * .28, h * .04]]);
    }
    ctx.restore();
  }

  drawLauncher(ctx, aim, selected, phy) {
    const pull = aim?.pull;
    const actual = pull ? { x: LAUNCH.x + pull.x, y: LAUNCH.y + pull.y } : LAUNCH;
    ctx.save();
    ctx.fillStyle = '#153744'; ctx.beginPath(); ctx.ellipse(LAUNCH.x, 478, 43, 7, 0, 0, Math.PI * 2); ctx.fill();
    line(ctx, '#794f3f', 16, [[235, 477], [235, 454], [219, 432]]);
    line(ctx, '#dba472', 10, [[237, 475], [238, 454], [258, 432]]);
    line(ctx, '#facb86', 2, [[238, 474], [238, 456], [257, 434]]);
    if (aim) line(ctx, '#e4b976', 5, [[219, 434], [actual.x, actual.y], [258, 434]]);
    else line(ctx, '#e4b976', 4, [[219, 434], [235, 449], [258, 434]]);
    ctx.fillStyle = '#edb569'; rounded(ctx, 230, 453, 14, 9, 2); ctx.fill();
    if (phy.status === 'ready' || !phy.status || aim) {
      const x = aim ? actual.x : LAUNCH.x, y = aim ? actual.y : LAUNCH.y;
      ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 20; drawCracker(ctx, selected, x, y, selected === 'rocket' ? 62 : 47, aim ? Math.atan2(aim.velocity?.y || 0, aim.velocity?.x || 1) : -.16); ctx.restore();
      if (!aim && phy.status === 'ready') {
        const pulse = 22 + Math.sin(this.time * .003) * 3;
        ctx.strokeStyle = 'rgba(255,220,149,.24)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(x, y, pulse + 15, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  drawAim(ctx, aim) {
    const points = aim.points || []; ctx.save();
    for (let i = 0; i < points.length; i++) {
      const p = points[i]; if (p.y > GROUND || p.x > W - 40 || p.x < 0) break;
      ctx.globalAlpha = .85 * (1 - i / Math.max(1, points.length)) + .07;
      ctx.fillStyle = i % 4 === 0 ? '#fff0cb' : GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, 3.7 - i * .045), 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    const power = Math.min(1, Math.hypot(aim.velocity?.x || 0, aim.velocity?.y || 0) / 23);
    ctx.strokeStyle = '#ffdf96'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(LAUNCH.x, LAUNCH.y, 57, Math.PI * .65, Math.PI * .65 + power * Math.PI * .7); ctx.stroke();
    ctx.restore();
  }

  drawProjectile(ctx, projectile, dt) {
    const p = projectile.position; const type = projectile.plugin?.type || 'rocket';
    if (!p || p.y > 860) return;
    if (!this.trail.length || Math.hypot(p.x - this.trail.at(-1).x, p.y - this.trail.at(-1).y) > 5) this.trail.push({ x: p.x, y: p.y, age: 0 });
    this.trail = this.trail.filter(t => t.age < 350); this.trail.forEach(t => t.age += dt);
    ctx.save();
    this.trail.forEach((t, i) => { ctx.globalAlpha = (1 - t.age / 350) * .55; ctx.fillStyle = type === 'chakri' ? '#71e5d7' : '#ffb663'; ctx.beginPath(); ctx.arc(t.x, t.y, i % 2 ? 2.5 : 4, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1; const angle = type === 'rocket' ? Math.atan2(projectile.velocity?.y || 0, projectile.velocity?.x || 1) : projectile.angle || 0;
    drawCracker(ctx, type, p.x, p.y, type === 'rocket' ? 55 : 43, angle);
    ctx.fillStyle = '#ffecae'; ctx.shadowColor = '#ffba53'; ctx.shadowBlur = 14;
    for (let i = 0; i < 4; i++) { const a = this.time * .016 + i * 1.7; ctx.beginPath(); ctx.arc(p.x - Math.cos(angle) * 16 + Math.cos(a) * 8, p.y - Math.sin(angle) * 16 + Math.sin(a) * 8, rand(1, 2), 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  drawEffects(ctx, dt) {
    const step = dt / 16.67;
    this.rings = this.rings.filter(e => e.age < e.life);
    this.rings.forEach(e => {
      e.age += dt; const t = e.age / e.life; const r = e.radius * (.22 + t * .85);
      ctx.save(); ctx.globalAlpha = (1 - t) * .65;
      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, Math.max(r, 1)); grad.addColorStop(0, '#fff5c5'); grad.addColorStop(.3, '#ffc677'); grad.addColorStop(.7, '#fc827d'); grad.addColorStop(1, 'rgba(249,127,95,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.color; ctx.lineWidth = Math.max(1, 7 * (1 - t)); ctx.beginPath(); ctx.arc(e.x, e.y, r * .8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    });
    this.effects = this.effects.filter(e => e.age < e.life);
    this.effects.forEach(e => {
      e.age += dt; e.x += e.vx * step; e.y += e.vy * step; e.vy += (e.smoke ? -.005 : .1) * step; e.vx *= .985;
      ctx.save(); ctx.globalAlpha = (1 - e.age / e.life) * (e.smoke ? .13 : 1); ctx.fillStyle = e.color;
      if (e.smoke) { ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (1 + e.age / e.life), 0, Math.PI * 2); ctx.fill(); }
      else if (e.rubble) { ctx.translate(e.x, e.y); ctx.rotate(e.age * .006); ctx.fillRect(-e.size, -e.size, e.size * 2, e.size * 1.5); }
      else if (e.spark) { ctx.strokeStyle = e.color; ctx.lineWidth = e.size / 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - e.vx * 2.4, e.y - e.vy * 2.4); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(e.x, e.y, e.size * (1 - e.age / e.life * .65), 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    this.popups = this.popups.filter(e => e.age < e.life);
    this.popups.forEach(e => {
      e.age += dt; const t = e.age / e.life; ctx.save(); ctx.globalAlpha = Math.min(1, (1 - t) * 4); ctx.translate(e.x, e.y - t * 48);
      const s = .8 + Math.min(1, t * 9) * .2; ctx.scale(s, s); ctx.rotate(-.055);
      ctx.font = '800 30px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#13223e'; ctx.strokeText(e.text, 0, 0); ctx.fillStyle = e.color; ctx.fillText(e.text, 0, 0); ctx.restore();
    });
  }

  drawVignette(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(6,13,35,.16)'); grad.addColorStop(.2, 'rgba(6,13,35,0)'); grad.addColorStop(.8, 'rgba(6,13,35,0)'); grad.addColorStop(1, 'rgba(6,13,35,.14)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  }
}
