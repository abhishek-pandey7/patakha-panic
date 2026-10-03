import { LEVELS } from './levels.js';
import { WORLD } from './config.js';

const { width: W, height: H, ground: GROUND, launcher: LAUNCH, maxSpeed: MAX_SPEED } = WORLD;
const PIXEL = 3, INK = '#152039', GOLD = '#ffcf66';
const COLORS = ['#ffcf66', '#ff7698', '#6df1c7', '#ab91fb', '#78d9ff'];
const MATERIAL_STYLE = {
  wood: { dark: '#654431', main: '#b97e49', light: '#edb77a', badge: '#ffc66c', strength: 1 },
  brick: { dark: '#713c51', main: '#e588ab', light: '#ffc3d0', badge: '#ff7b9a', strength: 2 },
  concrete: { dark: '#4b6179', main: '#839bb1', light: '#b6d0df', badge: '#7fd4fa', strength: 3 },
  metal: { dark: '#324552', main: '#6c879a', light: '#b3d1de', badge: '#baa1ff', strength: 4 },
};
const RECTS = {
  rocket: [40, 200, 650, 345], sutli: [790, 105, 400, 530],
  chakri: [75, 650, 510, 525], ladi: [610, 750, 630, 410],
};
const atlas = typeof Image !== 'undefined' ? new Image() : null;
export const crackerAtlasReady = atlas ? new Promise(resolve => { atlas.onload = resolve; atlas.onerror = resolve; }) : Promise.resolve();
if (atlas) atlas.src = (import.meta.env?.BASE_URL || '/') + 'assets/crackers-reference.png';

const FONT = {
  A:['01110','10001','10001','11111','10001','10001','10001'], B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'], D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'], F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01111'], H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'], J:['00111','00010','00010','00010','10010','10010','01100'],
  K:['10001','10010','10100','11000','10100','10010','10001'], L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'], N:['10001','11001','11001','10101','10011','10011','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'], P:['11110','10001','10001','11110','10000','10000','10000'],
  Q:['01110','10001','10001','10001','10101','10010','01101'], R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'], T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'], V:['10001','10001','10001','10001','10001','01010','00100'],
  W:['10001','10001','10001','10101','10101','10101','01010'], X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'], Z:['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'],
  '!':['00100','00100','00100','00100','00100','00000','00100'], '?':['01110','10001','00001','00010','00100','00000','00100'],
  '+':['00000','00100','00100','11111','00100','00100','00000'], '-':['00000','00000','00000','11111','00000','00000','00000'],
};
function q(n) { return Math.round(n / PIXEL) * PIXEL; }
function rand(min, max) { return min + Math.random() * (max - min); }
function fill(ctx, color, x, y, w, h) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color; ctx.fillRect(q(x), q(y), Math.max(PIXEL, q(w)), Math.max(PIXEL, q(h)));
}
function pixelLine(ctx, color, x1, y1, x2, y2, thickness = PIXEL) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / PIXEL));
  for (let i = 0; i <= steps; i++) fill(ctx, color, x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, thickness, thickness);
}
function pixelText(ctx, text, x, y, unit = PIXEL, color = GOLD, centered = true) {
  const letters = String(text).toUpperCase(), width = letters.length * unit * 6 - unit, start = centered ? x - width / 2 : x;
  letters.split('').forEach((char, index) => (FONT[char] || []).forEach((row, ry) => row.split('').forEach((bit, rx) => {
    if (bit === '1') fill(ctx, color, start + index * unit * 6 + rx * unit, y + ry * unit, unit, unit);
  })));
  return width;
}

/** Uses the actual supplied cracker illustrations, preserving their pixel-art edges. */
export function drawCracker(ctx, type, x, y, size, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.imageSmoothingEnabled = false;
  if (atlas?.complete && atlas.naturalWidth) {
    const [sx, sy, sw, sh] = RECTS[type] || RECTS.rocket, fit = size / Math.max(sw, sh);
    ctx.drawImage(atlas, sx, sy, sw, sh, -sw * fit / 2, -sh * fit / 2, sw * fit, sh * fit);
  } else if (type === 'rocket') {
    fill(ctx, INK, -size * .4, -size * .19, size * .76, size * .38);
    fill(ctx, '#ff365f', -size * .34, -size * .14, size * .55, size * .28);
    fill(ctx, '#ffcd48', size * .19, -size * .19, size * .13, size * .38);
    fill(ctx, '#ffe57b', size * .32, -size * .1, size * .1, size * .2);
  } else if (type === 'ladi') {
    pixelLine(ctx, '#edbd79', -size * .44, -size * .28, size * .4, -size * .1, size / 12);
    for (let i = 0; i < 5; i++) {
      fill(ctx, '#a91846', -size * .4 + i * size * .17, -size * .06, size * .14, size * .4);
      fill(ctx, '#ff4567', -size * .37 + i * size * .17, -size * .03, size * .08, size * .31);
    }
  } else {
    const color = type === 'sutli' ? '#0bb96e' : '#14bfde';
    fill(ctx, INK, -size * .34, -size * .29, size * .68, size * .58);
    fill(ctx, INK, -size * .26, -size * .38, size * .52, size * .76);
    fill(ctx, color, -size * .28, -size * .25, size * .56, size * .5);
    fill(ctx, color, -size * .2, -size * .31, size * .4, size * .62);
    fill(ctx, '#ffd274', -size * .08, -size * .3, size * .13, size * .62);
    pixelLine(ctx, '#ffd274', -size * .26, -size * .1, size * .25, size * .09, size / 10);
    pixelLine(ctx, '#efcc92', 0, -size * .3, size * .2, -size * .49, size / 13);
  }
  ctx.restore();
}

export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.time = 0;
    this.pixelCanvas = document.createElement('canvas'); this.pixelCanvas.width = W / PIXEL; this.pixelCanvas.height = H / PIXEL;
    this.pixelCtx = this.pixelCanvas.getContext('2d'); this.pixelCtx.imageSmoothingEnabled = false;
    this.effects = []; this.rings = []; this.popups = []; this.trail = []; this.fireworks = [];
    this.shake = 0; this.cameraX = 0; this.celebration = 0; this.nextCelebration = 0;
    this.viewport = { scale: 1, offsetX: 0, offsetY: 0, width: W, height: H }; this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect(), width = rect.width || W, height = rect.height || H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr); this.canvas.height = Math.round(height * this.dpr);
    const scale = Math.min(width / W, height / H);
    this.viewport = { scale, offsetX: (width - W * scale) / 2, offsetY: (height - H * scale) / 2, width, height };
    this.ctx.imageSmoothingEnabled = false;
  }

  toWorld(clientX, clientY) {
    const box = this.canvas.getBoundingClientRect(), v = this.viewport;
    return { x: (clientX - box.left - v.offsetX) / v.scale + q(this.cameraX), y: (clientY - box.top - v.offsetY) / v.scale };
  }

  addEffect(event) {
    const x = Number.isFinite(event.x) ? event.x : W * .8, y = Number.isFinite(event.y) ? event.y : GROUND - 180;
    if (event.type === 'explosion') {
      const radius = event.radius || 110; this.shake = Math.max(this.shake, Math.min(16, radius / 17));
      this.rings.push({ x, y, radius, age: 0, life: 540, color: event.cracker === 'chakri' ? '#74f7d4' : GOLD });
      for (let i = 0; i < Math.min(64, radius / 3 + 20); i++) {
        const angle = rand(0, Math.PI * 2), speed = rand(2, 10);
        this.effects.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life: rand(500, 1150), age: 0, size: rand(3, 9), color: COLORS[i % COLORS.length], spark: i % 3 === 0 });
      }
      for (let i = 0; i < 9; i++) this.effects.push({ x: x + rand(-24, 24), y: y + rand(-20, 20), vx: rand(-1, 1), vy: rand(-2, -.5), life: 1100, age: 0, size: rand(15, 27), color: '#cec5d3', smoke: true });
    }
    if (event.type === 'damage') for (let i = 0; i < 6; i++) this.effects.push({ x, y, vx: rand(-4, 4), vy: rand(-6, 0), size: rand(3, 9), age: 0, life: rand(450, 900), color: event.color || '#e6b187', rubble: true });
    if (event.type === 'ability') {
      for (let i = 0; i < 25; i++) this.effects.push({ x, y, vx: rand(-7, 0), vy: rand(-3, 3), size: rand(3, 7), age: 0, life: 500, color: COLORS[i % 3], spark: true });
      this.popups = this.popups.filter(e => e.kind !== 'ability');
      this.popups.push({ kind: 'ability', text: event.message || 'BOOST!', x, y: y - 60, age: 0, life: 1150, color: GOLD });
    }
    if (event.type === 'combo') {
      this.popups = this.popups.filter(e => e.kind !== 'combo');
      this.popups.push({ kind: 'combo', text: event.message || 'DHAMAKA X' + (event.combo || 3) + '!', x, y: y - 70, age: 0, life: 1700, color: GOLD });
    }
    if (event.type === 'win') this.popups = [{ kind: 'win', text: 'FULL PAISA VASOOL!', x: W * .78, y: GROUND - 430, age: 0, life: 2500, color: GOLD }];
    if (this.popups.length > 2) this.popups = this.popups.slice(-2);
    if (this.effects.length > 850) this.effects.splice(0, this.effects.length - 850);
  }

  celebrate() {
    this.celebration = 6500; this.nextCelebration = 0;
    for (let i = 0; i < 5; i++) this.firework(rand(W * .22, W * .9), rand(120, 360), true);
  }
  firework(x, y, big = false) {
    this.fireworks.push({ x, y, color: COLORS[Math.floor(rand(0, COLORS.length))], age: 0, life: big ? 2200 : 1500, rays: big ? 30 : 18, radius: big ? rand(85, 145) : rand(35, 65) });
  }

  render(state, dtMs = 16.67) {
    const dt = Math.min(dtMs, 50); this.time += dt; this.celebration = Math.max(0, this.celebration - dt);
    if (this.celebration > 0) {
      this.nextCelebration -= dt;
      if (this.nextCelebration <= 0) { this.firework(rand(W * .15, W * .93), rand(105, 330), true); this.nextCelebration = rand(220, 440); }
    }
    const ctx = this.pixelCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.pixelCanvas.width, this.pixelCanvas.height);
    ctx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
    // Sky and the entire launch-to-target gap are transparent. The user's video is the backdrop.
    this.drawFireworks(ctx, dt);
    const phy = state.physics || {}, projectile = phy.projectile;
    const follow = projectile && (phy.status === 'flight' || phy.status === 'settling');
    const desiredX = follow ? Math.min(24, Math.max(0, (projectile.position.x - LAUNCH.x - 450) * .022)) : 0;
    this.cameraX += (desiredX - this.cameraX) * .045; this.shake *= .87;
    ctx.save(); ctx.translate(-q(this.cameraX) + q(rand(-this.shake, this.shake)), q(rand(-this.shake * .6, this.shake * .6)));
    const showcase = state.mode === 'start' ? LEVELS[3] : null;
    this.drawGround(ctx); if (!showcase) this.drawLauncherBuilding(ctx);
    const bodies = showcase ? showcase.pieces.map(piece => ({ position: piece, angle: piece.angle || 0, plugin: { piece, health: 100, maxHealth: 100 } })) : phy.bodies || [];
    const obstacles = showcase ? [] : phy.obstacles || [];
    if (obstacles.length) obstacles.forEach(body => this.drawPiece(ctx, body));
    else if (!showcase && state.level?.obstacles) state.level.obstacles.forEach(piece => this.drawPiece(ctx, { position: piece, angle: piece.angle || 0, plugin: { piece, obstacle: true } }));
    if (bodies.length) bodies.forEach(body => this.drawPiece(ctx, body));
    else if (state.level?.pieces) state.level.pieces.forEach(piece => this.drawPiece(ctx, { position: piece, angle: piece.angle || 0, plugin: { piece, health: 100, maxHealth: 100 } }));
    if (!showcase) this.drawLauncher(ctx, state.aim, state.selected || 'rocket', phy);
    if (state.aim) this.drawAim(ctx, state.aim);
    if (projectile) this.drawProjectile(ctx, projectile, dt); else this.trail.length = 0;
    this.drawEffects(ctx, dt); ctx.restore();
    const out = this.ctx, v = this.viewport;
    out.setTransform(1, 0, 0, 1, 0, 0); out.clearRect(0, 0, this.canvas.width, this.canvas.height);
    out.imageSmoothingEnabled = false;
    out.setTransform(this.dpr * v.scale, 0, 0, this.dpr * v.scale, this.dpr * v.offsetX, this.dpr * v.offsetY);
    out.drawImage(this.pixelCanvas, 0, 0, W, H);
  }

  drawGround(ctx) {
    fill(ctx, '#223247', -30, GROUND, W + 60, H - GROUND);
    fill(ctx, '#8697a2', -30, GROUND, W + 60, 6);
    fill(ctx, '#4c6575', -30, GROUND + 6, W + 60, 12);
    fill(ctx, '#131f33', -30, GROUND + 18, W + 60, 9);
    for (let x = 0; x < W; x += 78) { fill(ctx, '#3c5062', x + 12, GROUND + 35, 30, 3); fill(ctx, '#192b40', x, GROUND + 65, 63, 3); }
    for (let x = 0; x < W; x += 114) fill(ctx, '#192a40', x, GROUND + 3, 3, 18);
    // No foreground diyas; background decoration comes directly from the source video.
  }

  drawLauncherBuilding(ctx) {
    const left = LAUNCH.x - 132, top = LAUNCH.y + 40, width = 258, height = GROUND - top;
    fill(ctx, INK, left - 6, top - 6, width + 12, height + 6);
    fill(ctx, '#2e717f', left, top, width, height); fill(ctx, '#235260', left + width - 30, top, 30, height);
    for (let row = 0; row < Math.ceil(height / 30); row++) {
      const y = top + row * 30; fill(ctx, '#275d6b', left, y, width, 3);
      for (let x = left + (row % 2 ? 36 : 0); x < left + width; x += 72) fill(ctx, '#275d6b', x, y, 3, 30);
    }
    fill(ctx, '#89d4cb', left - 12, top - 9, width + 24, 9); fill(ctx, '#4c9d9f', left - 12, top, width + 24, 12);
    [left + 39, left + 159].forEach(x => {
      const y = top + 66; fill(ctx, '#12333f', x - 6, y - 6, 54, 75); fill(ctx, '#e99054', x, y, 42, 63);
      fill(ctx, '#ffd38b', x + 6, y + 3, 30, 51); fill(ctx, '#45646e', x + 18, y, 6, 63); fill(ctx, '#45646e', x, y + 30, 42, 6);
      fill(ctx, '#f09a98', x - 15, y, 9, 57); fill(ctx, '#f09a98', x + 48, y, 9, 57);
      fill(ctx, '#6db6b6', x - 12, y + 66, 66, 9); fill(ctx, '#244a5c', x - 12, y + 75, 66, 6);
    });
    fill(ctx, '#163f50', left + 18, top - 42, 45, 33); fill(ctx, '#668c96', left + 15, top - 48, 51, 9);
    fill(ctx, '#4d7885', left + 24, top - 33, 33, 6); fill(ctx, '#4d7885', left + 24, top - 21, 33, 3);
    fill(ctx, '#bd754e', left + width - 51, top - 33, 33, 24); fill(ctx, '#e7a96d', left + width - 54, top - 36, 39, 9);
    fill(ctx, '#44775b', left + width - 42, top - 60, 9, 24); fill(ctx, '#599667', left + width - 48, top - 54, 21, 12);
    fill(ctx, '#ffad54', left + width - 45, top - 66, 12, 9);
  }

  drawPiece(ctx, body) {
    const data = body.plugin || {}, piece = data.piece || {}, pos = body.position || piece;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || pos.y > H + 100 || pos.x < -200 || pos.x > W + 200) return;
    const w = piece.w || 42, h = piece.h || 42;
    ctx.save(); ctx.translate(q(pos.x), q(pos.y)); ctx.rotate(body.angle || 0);
    const destroyed = !!data.destroyed, health = data.maxHealth ? Math.max(0, data.health / data.maxHealth) : 1;
    ctx.globalAlpha = destroyed ? .76 : 1;
    if (data.obstacle || ['obstacle','barricade','sign','arch','stair','ramp','canopy'].includes(piece.kind)) this.drawObstacle(ctx, piece, w, h);
    else this.drawMaterial(ctx, piece, w, h, destroyed, health);
    ctx.restore();
  }

  drawMaterial(ctx, piece, w, h, destroyed, health) {
    const material = piece.material || 'brick', style = MATERIAL_STYLE[material] || MATERIAL_STYLE.brick;
    const x = -w / 2, y = -h / 2; fill(ctx, style.dark, x, y, w, h);
    if (piece.kind === 'tank' || material === 'metal') {
      fill(ctx, style.main, x + 3, y + 6, w - 6, h - 12); fill(ctx, style.light, x + 6, y + 6, 6, h - 15);
      fill(ctx, '#415a72', x + w - 12, y + 6, 9, h - 12); fill(ctx, '#9cb4c5', x + 9, y, w - 18, 6); fill(ctx, '#d2e4e5', x + 15, y, w - 30, 3);
      for (let yy = y + 15; yy < y + h - 5; yy += 15) { fill(ctx, '#344957', x + 3, yy, w - 6, 3); fill(ctx, '#91afc2', x + 6, yy + 3, w - 15, 3); }
      fill(ctx, '#253b4e', -9, y - 6, 18, 6);
    } else if (material === 'wood') {
      fill(ctx, style.main, x + 3, y + 3, w - 6, h - 6); fill(ctx, style.light, x + 3, y + 3, w - 6, Math.min(6, h / 4));
      if (w > h) {
        for (let yy = y + 9; yy < y + h - 3; yy += 9) fill(ctx, '#926038', x + 9, yy, w - 18, 3);
        for (let xx = x + 30; xx < x + w; xx += 60) fill(ctx, '#dda367', xx, y + 3, 18, 3);
      } else {
        for (let xx = x + 9; xx < x + w - 3; xx += 9) fill(ctx, '#956139', xx, y + 12, 3, h - 24);
        fill(ctx, '#db9f5e', x + 6, y + h * .55, 3, h * .2);
      }
      fill(ctx, '#554638', x + 3, y + 6, 3, 3); fill(ctx, '#554638', x + w - 6, y + h - 9, 3, 3);
      if (piece.weak && !destroyed) {
        const stripeH = Math.min(h - 6, 30); fill(ctx, '#ffda76', x, -stripeH / 2, w, stripeH);
        ctx.save(); ctx.beginPath(); ctx.rect(x, -stripeH / 2, w, stripeH); ctx.clip();
        for (let i = -4; i < 8; i++) pixelLine(ctx, '#774a32', x - 12 + i * 15, stripeH / 2, x + 12 + i * 15, -stripeH / 2, 6);
        ctx.restore();
        if (Math.sin(this.time * .004 + piece.x) > -.2) {
          fill(ctx, GOLD, x - 6, y - 3, 9, 3); fill(ctx, GOLD, x - 6, y - 3, 3, 9);
          fill(ctx, GOLD, x + w - 3, y + h, 9, 3); fill(ctx, GOLD, x + w + 3, y + h - 6, 3, 9);
        }
      }
    } else if (material === 'brick') {
      const color = piece.color || style.main; fill(ctx, color, x + 3, y + 3, w - 6, h - 6);
      fill(ctx, style.light, x + 3, y + 3, w - 6, 3); fill(ctx, '#965c70', x + 3, y + h - 6, w - 6, 3);
      for (let row = 0; row < Math.ceil(h / 18); row++) {
        const yy = y + row * 18; if (row) fill(ctx, 'rgba(60,35,54,.28)', x + 3, yy, w - 6, 3);
        for (let xx = x + (row % 2 ? 21 : 0); xx < x + w - 3; xx += 42) if (xx > x + 3) fill(ctx, 'rgba(60,35,54,.28)', xx, yy + 3, 3, Math.min(15, y + h - yy - 3));
      }
      if (piece.kind === 'wall' && w >= 57 && h >= 39) this.drawWindow(ctx, w, h, destroyed, color);
    } else {
      fill(ctx, style.main, x + 3, y + 3, w - 6, h - 6); fill(ctx, style.light, x + 3, y + 3, w - 6, 6); fill(ctx, '#5c7088', x + 3, y + h - 9, w - 6, 6);
      for (let yy = y + 18; yy < y + h - 8; yy += 24) fill(ctx, '#6e859b', x + 3, yy, w - 6, 3);
      for (let i = 0; i < Math.floor(w * h / 600); i++) {
        const xx = x + 6 + ((i * 37) % Math.max(9, w - 12)), yy = y + 9 + ((i * 19) % Math.max(9, h - 18));
        fill(ctx, i % 2 ? '#91aabf' : '#667f96', xx, yy, 3, 3);
      }
      if (piece.kind === 'wall' && w >= 57 && h >= 39) this.drawWindow(ctx, w, h, destroyed, style.main);
      if (h < 30) { fill(ctx, '#c4d4dd', x + 12, y + 3, 6, Math.max(3, h - 6)); fill(ctx, '#50697f', x + w - 18, y + 3, 6, Math.max(3, h - 6)); }
    }
    if ((piece.kind === 'roof' || piece.kind === 'bridge') && !destroyed) {
      fill(ctx, '#26344c', x, y - 6, w, 3);
      for (let xx = x + 9, i = 0; xx < x + w - 3; xx += 27, i++) fill(ctx, COLORS[(i + (piece.group || 0)) % COLORS.length], xx, y - 3, 6, 6);
    }
    if (!destroyed && h >= 30 && w >= 20) this.resistanceBadge(ctx, style, x + w - 3, y + 6);
    if (health < .75 || destroyed) {
      pixelLine(ctx, style.dark, -w * .35, -h * .4, -w * .12, -h * .06, 3);
      pixelLine(ctx, style.dark, -w * .12, -h * .06, -w * .21, h * .18, 3);
      pixelLine(ctx, style.dark, -w * .21, h * .18, w * .08, h * .4, 3);
      if (health < .32) pixelLine(ctx, style.dark, w * .33, -h * .34, w * .12, h * .18, 6);
    }
  }

  resistanceBadge(ctx, style, right, top) {
    const width = style.strength * 6 + 6; fill(ctx, INK, right - width, top, width, 12);
    for (let i = 0; i < style.strength; i++) fill(ctx, style.badge, right - width + 3 + i * 6, top + 3, 3, 6);
  }
  drawWindow(ctx, w, h, destroyed, color) {
    const ww = Math.min(36, Math.floor(w * .37 / 3) * 3), hh = Math.min(39, h - 15);
    fill(ctx, '#25334a', -ww / 2 - 6, -hh / 2 - 3, ww + 12, hh + 6);
    fill(ctx, destroyed ? '#9e8b67' : '#eca55b', -ww / 2, -hh / 2, ww, hh);
    fill(ctx, destroyed ? '#b09b72' : '#ffdc89', -ww / 2 + 3, -hh / 2 + 3, ww - 6, Math.max(6, hh - 9));
    fill(ctx, '#685050', -3, -hh / 2, 6, hh); fill(ctx, '#685050', -ww / 2, 3, ww, 3);
    fill(ctx, '#4f6878', -ww / 2 - 9, hh / 2, ww + 18, 6); fill(ctx, color, -ww / 2 - 6, -hh / 2 + 3, 3, 12);
  }

  drawObstacle(ctx, piece, w, h) {
    const x = -w / 2, y = -h / 2, kind = piece.kind;
    if ((kind === 'canopy' || kind === 'sign') && w >= 72 && h <= 42) {
      // Decorative suspension explains the fixed overhead obstacle; cables have no collider.
      ctx.save(); ctx.globalAlpha *= .56;
      const cableTop = -Math.max(0, piece.y || 0);
      for (const cableX of [x + 21, x + w - 24]) {
        fill(ctx, '#7890a6', cableX, cableTop, 3, y - cableTop + 3);
        for (let yy = cableTop + 12; yy < y - 6; yy += 27) fill(ctx, '#a3b4c2', cableX, yy, 3, 6);
        fill(ctx, '#b4c9d5', cableX - 3, y - 6, 9, 6);
      }
      ctx.restore();
    }
    if (kind === 'barricade' || kind === 'sign') {
      fill(ctx, '#302d40', x, y, w, h); fill(ctx, '#ecab4e', x + 3, y + 3, w - 6, h - 6);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 3, y + 3, w - 6, h - 6); ctx.clip();
      for (let i = -8; i < Math.ceil((w + h) / 27); i++) pixelLine(ctx, '#454355', x + i * 27, y + h, x + i * 27 + h * .7, y, 12);
      ctx.restore(); fill(ctx, '#ffda83', x + 6, y + 3, w - 12, 3);
      if (kind === 'sign' && w > 72 && h > 33) { fill(ctx, '#213448', -33, -12, 66, 24); pixelText(ctx, 'UP', 0, -9, 3, '#ffd781'); }
      return;
    }
    if (kind === 'canopy') {
      if (piece.material === 'metal') {
        fill(ctx, '#293d55', x, y, w, h); fill(ctx, '#718fa6', x + 3, y + 3, w - 6, h - 6);
        fill(ctx, '#b9d2dc', x + 3, y + 3, w - 6, 6); fill(ctx, '#3e5771', x + 3, y + h - 9, w - 6, 6);
        for (let xx = x + 15; xx < x + w - 6; xx += 36) { fill(ctx, '#324b60', xx, y + 9, 6, 6); fill(ctx, '#b4c6d1', xx, y + 9, 3, 3); }
        fill(ctx, '#ffcf66', x + 3, y + 9, 9, h - 15); fill(ctx, '#ffcf66', x + w - 12, y + 9, 9, h - 15);
        return;
      }
      fill(ctx, '#4b364c', x, y, w, h);
      for (let xx = x + 3, i = 0; xx < x + w - 3; xx += 21, i++) {
        fill(ctx, i % 2 ? '#efbc62' : '#e46f81', xx, y + 3, Math.min(21, x + w - xx - 3), h - 6);
        fill(ctx, i % 2 ? '#ffe09b' : '#ffa3ae', xx, y + 3, Math.min(21, x + w - xx - 3), 3);
      }
      fill(ctx, '#53424d', x + 3, y + h - 6, w - 6, 3); return;
    }
    if (kind === 'ramp' || kind === 'stair') {
      fill(ctx, '#38475b', x, y, w, h); fill(ctx, '#71919f', x + 3, y + 3, w - 6, h - 6);
      fill(ctx, '#b5c8cb', x + 3, y + 3, w - 6, 6);
      for (let xx = x + 12; xx < x + w - 3; xx += 24) { fill(ctx, '#536d7e', xx, y + 9, 3, h - 12); fill(ctx, '#d7b377', xx, y + 3, 9, 3); }
      return;
    }
    if (piece.material === 'wood') { this.drawMaterial(ctx, { ...piece, kind: 'support', weak: false }, w, h, false, 1); return; }
    // Arch components and walls retain their actual rectangular collider silhouettes.
    fill(ctx, '#6c5b57', x, y, w, h); fill(ctx, '#b78d71', x + 3, y + 3, w - 6, h - 6);
    fill(ctx, '#e4b58b', x + 3, y + 3, w - 6, 6); fill(ctx, '#9b735f', x + w - 9, y + 9, 6, h - 12);
    for (let row = 0; row < Math.ceil(h / 24); row++) {
      const yy = y + row * 24; if (row) fill(ctx, '#8e6c5c', x + 3, yy, w - 6, 3);
      for (let xx = x + (row % 2 ? 18 : 0); xx < x + w - 3; xx += 39) if (xx > x + 3) fill(ctx, '#8e6c5c', xx, yy + 3, 3, Math.min(21, y + h - yy - 3));
    }
    if (kind === 'arch') {
      fill(ctx, '#dba973', x + 6, y + 9, w - 12, 3);
      if (w < 80 && h > 90) { fill(ctx, '#725648', -9, y + 30, 18, 27); fill(ctx, '#e7bf7c', -3, y + 36, 6, 12); }
    }
    if (kind === 'wall' || kind === 'obstacle') fill(ctx, '#d8ae7d', x + 3, y + h - 12, w - 6, 6);
  }

  drawLauncher(ctx, aim, selected, phy) {
    const actual = aim?.pull ? { x: LAUNCH.x + aim.pull.x, y: LAUNCH.y + aim.pull.y } : LAUNCH, base = LAUNCH.y + 37;
    fill(ctx, '#123443', LAUNCH.x - 42, base - 3, 84, 9);
    pixelLine(ctx, '#65402f', LAUNCH.x - 3, base, LAUNCH.x - 3, LAUNCH.y + 9, 18);
    pixelLine(ctx, '#ae744c', LAUNCH.x, base, LAUNCH.x, LAUNCH.y + 6, 12);
    pixelLine(ctx, '#e9b377', LAUNCH.x + 6, base - 3, LAUNCH.x + 6, LAUNCH.y + 12, 3);
    pixelLine(ctx, '#865539', LAUNCH.x, LAUNCH.y + 12, LAUNCH.x - 21, LAUNCH.y - 21, 15);
    pixelLine(ctx, '#dca169', LAUNCH.x + 3, LAUNCH.y + 12, LAUNCH.x + 24, LAUNCH.y - 21, 12);
    pixelLine(ctx, '#f8c783', LAUNCH.x - 18, LAUNCH.y - 21, actual.x, actual.y, 6);
    pixelLine(ctx, '#f8c783', actual.x, actual.y, LAUNCH.x + 24, LAUNCH.y - 21, 6);
    if (phy.status === 'ready' || !phy.status || aim) {
      drawCracker(ctx, selected, actual.x, actual.y, selected === 'rocket' ? 69 : 57, aim ? Math.atan2(aim.velocity?.y || 0, aim.velocity?.x || 1) : -.12);
      if (!aim && phy.status === 'ready') {
        const radius = 45 + q(Math.sin(this.time * .004) * 3); ctx.save(); ctx.globalAlpha = .45;
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([xx, yy]) => {
          fill(ctx, GOLD, LAUNCH.x + xx * radius - (xx > 0 ? 9 : 0), LAUNCH.y + yy * radius, 12, 3);
          fill(ctx, GOLD, LAUNCH.x + xx * radius, LAUNCH.y + yy * radius - (yy > 0 ? 9 : 0), 3, 12);
        }); ctx.restore();
      }
    }
  }

  drawAim(ctx, aim) {
    const points = aim.points || []; ctx.save();
    points.forEach((p, index) => {
      if (p.y > GROUND || p.x > W - 12 || p.x < 0) return;
      // Every predicted point stays equally readable across the long, detailed video backdrop.
      ctx.globalAlpha = .9;
      fill(ctx, '#111b30', p.x - 6, p.y - 6, 12, 12);
      ctx.globalAlpha = 1;
      fill(ctx, index % 4 ? GOLD : '#fff6d3', p.x - 3, p.y - 3, 6, 6);
    });
    ctx.globalAlpha = 1;
    const power = Math.min(1, Math.hypot(aim.velocity?.x || 0, aim.velocity?.y || 0) / MAX_SPEED);
    fill(ctx, '#29364b', LAUNCH.x - 54, LAUNCH.y + 67, 108, 12); fill(ctx, GOLD, LAUNCH.x - 51, LAUNCH.y + 70, 102 * power, 6);
    ctx.restore();
  }

  drawProjectile(ctx, projectile, dt) {
    const p = projectile.position; if (!p || p.y > H + 30) return; const type = projectile.plugin?.type || 'rocket';
    if (!this.trail.length || Math.hypot(p.x - this.trail.at(-1).x, p.y - this.trail.at(-1).y) > 6) this.trail.push({ x: p.x, y: p.y, age: 0 });
    this.trail = this.trail.filter(t => t.age < 500); this.trail.forEach(t => t.age += dt);
    ctx.save(); this.trail.forEach((t, i) => {
      ctx.globalAlpha = (1 - t.age / 500) * .62;
      fill(ctx, type === 'chakri' ? '#61e9d0' : '#ffc36f', t.x - 3, t.y - 3, i % 3 ? 3 : 6, i % 3 ? 3 : 6);
    });
    ctx.globalAlpha = 1; const angle = type === 'rocket' ? Math.atan2(projectile.velocity?.y || 0, projectile.velocity?.x || 1) : projectile.angle || 0;
    drawCracker(ctx, type, q(p.x), q(p.y), type === 'rocket' ? 63 : 51, angle);
    for (let i = 0; i < 4; i++) {
      const a = this.time * .018 + i * 1.7;
      fill(ctx, i % 2 ? '#ffaf50' : '#fff0a9', p.x - Math.cos(angle) * 21 + Math.cos(a) * 9, p.y - Math.sin(angle) * 21 + Math.sin(a) * 9, 3, 3);
    }
    ctx.restore();
  }

  drawFireworks(ctx, dt) {
    this.fireworks = this.fireworks.filter(f => f.age < f.life);
    this.fireworks.forEach(f => {
      f.age += dt; const progress = f.age / f.life, radius = f.radius * Math.min(1, progress * 3.3);
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - progress);
      for (let i = 0; i < f.rays; i++) {
        const angle = i * Math.PI * 2 / f.rays, drift = progress * progress * 42;
        pixelLine(ctx, f.color, f.x + Math.cos(angle) * radius * .73, f.y + Math.sin(angle) * radius * .73 + drift, f.x + Math.cos(angle) * radius, f.y + Math.sin(angle) * radius + drift, 3);
        fill(ctx, '#ffebbb', f.x + Math.cos(angle) * radius, f.y + Math.sin(angle) * radius + drift, 6, 6);
      }
      ctx.restore();
    });
  }

  drawEffects(ctx, dt) {
    const step = dt / 16.67; this.rings = this.rings.filter(e => e.age < e.life);
    this.rings.forEach(e => {
      e.age += dt; const t = e.age / e.life, radius = e.radius * (.2 + t * .86); ctx.save(); ctx.globalAlpha = (1 - t) * .82;
      if (t < .38) {
        fill(ctx, '#ffd578', e.x - radius * .3, e.y - radius * .12, radius * .6, radius * .24);
        fill(ctx, '#ffb169', e.x - radius * .12, e.y - radius * .3, radius * .24, radius * .6);
        fill(ctx, '#fff2bd', e.x - radius * .1, e.y - radius * .1, radius * .2, radius * .2);
      }
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; fill(ctx, e.color, e.x + Math.cos(a) * radius - 3, e.y + Math.sin(a) * radius - 3, t < .4 ? 9 : 6, t < .4 ? 9 : 6); }
      ctx.restore();
    });
    this.effects = this.effects.filter(e => e.age < e.life);
    this.effects.forEach(e => {
      e.age += dt; e.x += e.vx * step; e.y += e.vy * step; e.vy += (e.smoke ? -.005 : .12) * step; e.vx *= .986;
      ctx.save(); ctx.globalAlpha = (1 - e.age / e.life) * (e.smoke ? .25 : 1);
      if (e.smoke) {
        const s = q(e.size * (1 + e.age / e.life));
        fill(ctx, e.color, e.x - s / 2, e.y - s / 3, s, s * .67); fill(ctx, e.color, e.x - s / 3, e.y - s / 2, s * .67, s);
      } else if (e.spark) pixelLine(ctx, e.color, e.x, e.y, e.x - e.vx * 2.6, e.y - e.vy * 2.6, Math.max(3, q(e.size / 2)));
      else {
        fill(ctx, e.color, e.x, e.y, e.size, e.rubble ? e.size * .67 : e.size);
        if (e.rubble) fill(ctx, '#eacdb0', e.x, e.y, Math.max(3, e.size - 3), 3);
      }
      ctx.restore();
    });
    this.popups = this.popups.filter(e => e.age < e.life);
    this.popups.forEach(e => {
      e.age += dt; const t = e.age / e.life, text = String(e.text).toUpperCase(), unit = text.length > 9 ? 3 : 6;
      const width = text.length * unit * 6, center = Math.max(width / 2 + 21, Math.min(W - width / 2 - 21, e.x)), top = e.y - t * 51;
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - t) * 4);
      fill(ctx, INK, center - width / 2 - 9, top - 9, width + 18, unit * 7 + 18);
      fill(ctx, '#49354e', center - width / 2 - 9, top + unit * 7 + 9, width + 18, 3);
      pixelText(ctx, text, center, top, unit, e.color); ctx.restore();
    });
  }
}
