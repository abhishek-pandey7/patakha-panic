import { LEVELS, CRACKERS } from './levels.js';
import { drawCracker, crackerAtlasReady } from './art.js';
import * as Physics from './physics.js';
import { normalizeUIScale as normalizeUISize } from './progress.js';

const TYPES = ['rocket', 'sutli', 'chakri', 'ladi'];
export const UI_SCALES = [0.8, 0.9, 1, 1.15, 1.3];
const UI_SIZE_NAMES = ['Small', 'Compact', 'Standard', 'Large', 'Largest'];
const COMPACT_HINTS = [
  'Full pull. Clear the barricade; boost into striped wood.',
  'Aim below the sign. Break a leg; follow with a low shot.',
  'Lob over the arch. Sutli softens brick; boost breaks concrete.',
  'Clear the steps. Tip the tall tower toward its neighbour.',
  'Use the ramp. Roll Chakri low through wooden shopfronts.',
  'Clear the walls. Light Ladi between the shops.',
  'Thread below the canopy. Boost into reinforced legs.',
  'Clear the canopies. Mix Sutli blasts with Rocket boosts.',
  'Lob over the wall. Boost through the steel legs.',
  'Stay under the sign. Drop the middle tower sideways.',
  'Squeeze under the canopy. Boost into each steel pier.',
  'All reinforced. Match every cracker to its material.',
];
const MATERIAL_FALLBACK = {
  wood: { displayname: 'Wood', health: 60, resistance: { rocket: 1, boostedRocket: 1.25, sutli: .95, chakri: 1.7, ladi: 1.55 } },
  brick: { displayname: 'Brick', health: 115, resistance: { rocket: .75, boostedRocket: 1.1, sutli: 1.45, chakri: .6, ladi: .85 } },
  concrete: { displayname: 'Concrete', health: 210, resistance: { rocket: .28, boostedRocket: 1.3, sutli: .9, chakri: .15, ladi: .25 } },
  metal: { displayname: 'Steel', health: 240, resistance: { rocket: .25, boostedRocket: 1.8, sutli: .6, chakri: .12, ladi: .15 } },
};
const materials = () => Physics.MATERIALS || MATERIAL_FALLBACK;
const formatScore = (value) => Math.round(value || 0).toLocaleString('en-IN');
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ICONS = {
  play: '<path d="M7 4h4v3h4v3h4v4h-4v3h-4v3H7Z"/>',
  pause: '<path d="M7 5h3v14H7ZM15 5h3v14h-3Z"/>',
  restart: '<path d="M6 4h12v3h3v11h-3v3H6v-3H3v-5M3 3v6h6"/>',
  sound: '<path d="M3 8h4V6h2V4h3v16H9v-2H7v-2H3ZM16 8h2v8h-2M20 5h2v14h-2"/>',
  mute: '<path d="M3 8h4V6h2V4h3v16H9v-2H7v-2H3ZM16 9h2v2h2v2h2v2M22 9h-2v2h-2v2h-2v2"/>',
  music: '<path d="M9 18V4h12v12M9 8h12"/><rect x="3" y="16" width="6" height="4"/><rect x="15" y="14" width="6" height="4"/>',
  musicOff: '<path d="M9 18V4h12v7M9 8h12M16 14h2v2h2v2h2v2M22 14h-2v2h-2v2h-2v2"/><rect x="3" y="16" width="6" height="4"/>',
  help: '<rect x="3" y="3" width="18" height="18"/><path d="M8 8V6h8v5h-4v3M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11"/><path d="M8 10V4h8v6M12 14v3"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  settings: '<path d="M8 3h8v3h5v12h-5v3H8v-3H3V6h5Z"/><rect x="9" y="9" width="6" height="6"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${ICONS[name] || ICONS.arrow}</svg>`;
const diya = (lit = true, index = 0) => `<span class="diya ${lit ? 'is-lit' : ''}" style="--i:${index}" aria-hidden="true"><span class="diya-flame"></span><span class="diya-bowl"></span></span>`;
// Android browsers can lock orientation, but only while the page is full screen.
const canLockLandscape = () => Boolean(document.documentElement.requestFullscreen && screen.orientation?.lock);
const mini = (type, cls = '') => `<canvas class="cracker-icon ${cls}" data-cracker="${type}" width="160" height="120" aria-hidden="true"></canvas>`;

/** DOM interface for the game. Simulation and transitions remain in main.js. */
export class GameUI {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.state = { save: { unlocked: 1, best: {}, music: true, sound: true, uiScale: 3 }, selected: 'rocket', level: LEVELS[0], physics: {} };
    this.screenName = 'start';
    this.root = document.getElementById('app');
    this.root.innerHTML = `
      <main class="game-stage" aria-label="Patakha Panic game">
        <video id="festival-video" class="festival-video" src="./assets/diwali-background.mp4" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>
        <div class="video-wash" aria-hidden="true"></div>
        <canvas id="game-canvas" aria-label="Drag backwards from the launcher to aim, then release. Tap during flight to activate your firecracker." tabindex="0"></canvas>
        <div class="stage-vignette" aria-hidden="true"></div>
        <header class="game-header">
          <button class="brand" data-action="home" aria-label="Patakha Panic home"><span class="brand-mark">✦</span><span>PATAKHA<span class="brand-second">PANIC<span class="brand-dot">.</span></span></span></button>
          <div class="header-actions">
            <button class="icon-button" id="music-toggle" data-action="music" aria-label="Turn music off" title="Music">${icon('music')}</button>
            <button class="icon-button" id="sound-toggle" data-action="sound" aria-label="Turn sound off" title="Sound effects">${icon('sound')}</button>
            <button class="icon-button" data-action="help" aria-label="How to play" title="How to play">${icon('help')}</button>
            <button class="icon-button" id="settings-toggle" data-action="settings" aria-label="Settings and UI size" title="Settings · UI size">${icon('settings')}</button>
          </div>
        </header>
        <section id="game-hud" class="game-hud" aria-label="Level status" hidden>
          <div class="hud-location"><span id="hud-level-number" class="eyebrow">LEVEL 01 / ${String(LEVELS.length).padStart(2, '0')}</span><strong id="hud-level-name">Gully Warm-Up</strong></div>
          <div class="hud-stat"><span class="eyebrow">SCORE</span><strong id="hud-score">0</strong></div>
          <div class="destruction-box"><div class="meter-label"><span>DESTRUCTION</span><strong id="hud-progress">0<span>%</span></strong></div><div class="destruction-track"><span id="destruction-fill"></span><i title="90% to win"></i></div></div>
          <button class="icon-button" data-action="restart" aria-label="Restart level" title="Restart">${icon('restart')}</button>
          <button class="icon-button" data-action="pause" aria-label="Pause game" title="Pause">${icon('pause')}</button>
        </section>
        <div id="level-hint" class="level-hint" hidden><span>✦</span><span id="level-hint-text"></span></div>
        <div id="cracker-matchup" class="cracker-matchup" aria-label="Selected firecracker material damage" hidden><span id="matchup-title">ROCKET / DAMAGE</span><span id="matchup-materials"></span><span id="matchup-tip">BOOST FOR TOUGH SUPPORTS</span></div>
        <section id="cracker-toolbar" class="cracker-toolbar" aria-label="Choose firecracker" hidden>
          <div class="ammo-count"><strong id="hud-remaining">3</strong><span>SHOTS<br>LEFT</span></div>
          <div class="cracker-tray">${TYPES.map((type, i) => `<button class="cracker-card" data-type="${type}" aria-label="Choose ${escapeHTML(CRACKERS[type]?.name || type)}">${mini(type)}<span class="cracker-card-copy"><span class="cracker-name">${escapeHTML(CRACKERS[type]?.name || type)}</span><span class="cracker-role">${['Precision', 'Big blast', 'Roll low', 'Chain pops'][i]}</span></span><span class="cracker-key">${i + 1}</span><span class="cracker-lock">${icon('lock')}</span></button>`).join('')}</div>
          <div class="shot-status"><span id="shot-instruction">DRAG. AIM. RELEASE.</span><button id="ability-button" class="ability-button" data-action="ability" hidden>BOOST ${icon('arrow')}</button></div>
        </section>
        <div id="screen-layer" class="screen-layer"></div>
        <div id="toast" class="game-toast" role="status" aria-live="polite"></div>
        <section class="rotate-gate" role="alertdialog" aria-modal="true" aria-labelledby="rotate-heading" aria-describedby="rotate-copy">
          <div class="rotate-phone" aria-hidden="true"><span></span></div>
          <span class="eyebrow">MORE SKYLINE. MORE DHAMAKA.</span>
          <h2 id="rotate-heading">Turn it <span>sideways.</span></h2>
          <p id="rotate-copy">Patakha Panic plays in landscape. Rotate your device to continue.</p>
          ${canLockLandscape() ? `<button class="button button-primary" data-action="landscape">PLAY FULL SCREEN ${icon('arrow')}</button>` : ''}
        </section>
      </main>`;
    this.canvas = document.getElementById('game-canvas');
    this.canvas.addEventListener('pointerdown', () => {
      if (this.screenName === 'play' && this.state.physics?.status === 'ready') this.root.dataset.aiming = 'true';
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.canvas.addEventListener(event, () => { this.root.dataset.aiming = 'false'; });
    this.layer = document.getElementById('screen-layer');
    this.video = document.getElementById('festival-video');
    this.video.muted = true;
    this.video.play().catch(() => {});
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('input', (event) => {
      if (event.target.id === 'ui-scale-slider') this.setUIScale(event.target.value);
    });
    this.root.addEventListener('keydown', (event) => {
      if (this.screenName !== 'settings' || event.key !== 'Tab') return;
      const controls = [...this.layer.querySelectorAll('button:not(:disabled),input')].filter(node => node.getBoundingClientRect().width);
      if (!controls.length) return;
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    this.root.addEventListener('pointerdown', () => this.video.play().catch(() => {}), { once: true });
    this.applyUIScale(this.state.save.uiScale);
    this.uiObserver = new ResizeObserver(() => this.queueLayoutMeasurement());
    for (const id of ['cracker-toolbar', 'game-hud', 'level-hint']) this.uiObserver.observe(document.getElementById(id));
    window.addEventListener('resize', () => this.queueLayoutMeasurement());
    this.showScreen('start');
    // Draw again when the local atlas has arrived; art.js owns its actual rendering.
    const atlas = new Image();
    atlas.onload = () => this.renderIcons();
    atlas.src = './assets/crackers-reference.png';
    crackerAtlasReady?.then(() => this.renderIcons());
    this.renderIcons();
  }

  handleClick(event) {
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    if (target.matches('.cracker-card') && target.dataset.type) { this.callbacks.select?.(target.dataset.type); this.flashTips(3000); return; }
    if (target.dataset.level) { this.callbacks.level?.(Number(target.dataset.level)); return; }
    const action = target.dataset.action;
    if (!action) return;
    if (action === 'music' || action === 'sound') {
      const enabled = !this.state.save[action];
      this.state.save[action] = enabled;
      this.callbacks[action]?.(enabled);
      this.updateToggles();
      return;
    }
    if (action === 'help') { this.openHelp(); return; }
    if (action === 'settings') { this.openSettings(); return; }
    if (action === 'close-settings') { this.closeSettings(); return; }
    if (action === 'ui-smaller' || action === 'ui-larger') {
      this.setUIScale(normalizeUISize(this.state.save.uiScale) + (action === 'ui-larger' ? 1 : -1));
      return;
    }
    if (action === 'close-help') {
      const name = this.helpReturn || 'start';
      this.showScreen(name, this.helpReturnData || {});
      if (name === 'play') this.callbacks.resume?.();
      return;
    }
    if (action === 'levels') { this.callbacks.menu?.(); return; }
    if (action === 'start-back') { this.callbacks.home?.(); return; }
    if (action === 'close-unlock') {
      const onClose = this.screenData?.onClose;
      this.showScreen('play');
      onClose?.();
      return;
    }
    if (action === 'home') {
      this.callbacks.home?.();
      return;
    }
    if (action === 'menu') { this.callbacks.menu?.(); return; }
    this.callbacks[action]?.();
  }

  openHelp() {
    if (this.screenName === 'settings') this.closeSettings();
    if (this.screenName !== 'help') {
      this.helpReturn = this.screenName;
      this.helpReturnData = this.screenData;
    }
    if (this.helpReturn === 'play') this.callbacks.pause?.();
    this.showScreen('help');
  }

  openSettings() {
    if (this.screenName === 'settings') return;
    this.settingsReturn = { name: this.screenName, data: this.screenData, helpReturn: this.helpReturn, helpReturnData: this.helpReturnData };
    this.settingsOpener = document.activeElement;
    if (this.screenName === 'play') this.callbacks.pause?.();
    this.showScreen('settings');
    requestAnimationFrame(() => document.getElementById('ui-scale-slider')?.focus());
  }

  closeSettings() {
    if (this.screenName !== 'settings') return;
    const previous = this.settingsReturn || { name: 'start', data: {} };
    this.helpReturn = previous.helpReturn;
    this.helpReturnData = previous.helpReturnData;
    this.showScreen(previous.name, previous.data);
    this.settingsReturn = null;
    if (previous.name === 'play') this.callbacks.resume?.();
    if (this.settingsOpener?.isConnected) this.settingsOpener.focus();
    else document.getElementById('settings-toggle')?.focus();
  }

  setUIScale(value) {
    const size = normalizeUISize(value);
    this.state.save.uiScale = size;
    this.applyUIScale(size);
    this.callbacks.uiScale?.(size);
  }

  applyUIScale(value) {
    const size = normalizeUISize(value);
    if (this.appliedUISize !== size) {
      this.appliedUISize = size;
      this.root.dataset.uiSize = String(size);
      this.root.style.setProperty('--ui-scale', UI_SCALES[size - 1]);
      this.queueLayoutMeasurement();
    }
    const slider = document.getElementById('ui-scale-slider');
    if (slider) {
      slider.value = String(size);
      slider.setAttribute('aria-valuetext', `${size} of 5, ${UI_SIZE_NAMES[size - 1]}`);
      document.getElementById('ui-scale-value').textContent = `${size} / 5 · ${UI_SIZE_NAMES[size - 1]}`;
      this.layer.querySelector('[data-action="ui-smaller"]').disabled = size === 1;
      this.layer.querySelector('[data-action="ui-larger"]').disabled = size === 5;
    }
  }

  queueLayoutMeasurement() {
    if (this.layoutFrame) return;
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = null;
      const toolbar = document.getElementById('cracker-toolbar');
      const compact = matchMedia('(max-height:510px) and (orientation:landscape)').matches;
      if (toolbar && !toolbar.hidden && compact) {
        const band = Math.ceil(toolbar.getBoundingClientRect().height + parseFloat(getComputedStyle(toolbar).bottom || 0) + 8);
        this.root.style.setProperty('--ui-tray-band', `${band}px`);
      }
      const hud = document.getElementById('game-hud');
      if (hud && !hud.hidden) this.root.style.setProperty('--ui-hud-bottom', `${Math.ceil(hud.getBoundingClientRect().bottom)}px`);
      const hint = document.getElementById('level-hint');
      if (hint && !hint.hidden) this.root.style.setProperty('--ui-hint-bottom', `${Math.ceil(hint.getBoundingClientRect().bottom)}px`);
    });
  }

  renderIcons() {
    this.root.querySelectorAll('canvas[data-cracker]').forEach((canvas) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      drawCracker(ctx, canvas.dataset.cracker, canvas.width / 2, canvas.height / 2, 110, 0);
    });
  }

  update(state) {
    this.state = { ...this.state, ...state, save: state.save || this.state.save };
    this.applyUIScale(this.state.save.uiScale);
    const { level, physics = {}, selected = 'rocket' } = this.state;
    const compact = window.matchMedia('(max-height: 510px) and (orientation: landscape)').matches;
    const set = (id, text) => { const node = document.getElementById(id); if (node && node.textContent !== String(text)) node.textContent = text; };
    set('hud-level-number', `LEVEL ${String(level?.id || 1).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`);
    set('hud-level-name', level?.name || 'Gully Warm-Up');
    document.getElementById('hud-level-name').title = level?.name || 'Gully Warm-Up';
    const compactScore = compact || (this.appliedUISize >= 4 && innerWidth < 1700);
    set('hud-score', compactScore && physics.score >= 1000 ? `${(physics.score / 1000).toFixed(physics.score >= 100000 ? 0 : 1)}K` : formatScore(physics.score));
    document.getElementById('hud-score').title = `${formatScore(physics.score)} points`;
    document.getElementById('hud-score').setAttribute('aria-label', `${formatScore(physics.score)} points`);
    const progress = Math.max(0, Math.min(100, Math.round(physics.progress || 0)));
    const progressLabel = document.getElementById('hud-progress');
    if (progressLabel.dataset.value !== String(progress)) {
      progressLabel.dataset.value = String(progress);
      progressLabel.innerHTML = `${progress}<span>%</span>`;
    }
    document.getElementById('destruction-fill').style.width = `${progress}%`;
    document.getElementById('destruction-fill').classList.toggle('is-complete', progress >= 90);
    set('hud-remaining', physics.remaining ?? level?.shots ?? 3);
    set('level-hint-text', compact ? COMPACT_HINTS[(level?.id || 1) - 1] : level?.hint || 'Find the weak point. Let gravity do the rest.');
    document.getElementById('level-hint').title = level?.hint || '';
    this.root.dataset.flight = String(['flight', 'settling'].includes(physics.status));
    const ready = physics.status === 'ready' || !physics.status;
    this.root.querySelectorAll('.cracker-card').forEach((button) => {
      const allowed = level?.unlockedTypes?.includes(button.dataset.type) ?? true;
      button.classList.toggle('is-selected', button.dataset.type === selected);
      button.classList.toggle('is-locked', !allowed);
      button.disabled = !allowed || !ready;
      button.setAttribute('aria-pressed', String(button.dataset.type === selected));
      button.title = allowed ? `${CRACKERS[button.dataset.type]?.description || ''} Damage: ${Object.entries(materials()).map(([key, material]) => `${material.displayname || material.displayName || material.name || MATERIAL_FALLBACK[key]?.displayname} ${Math.round((material.resistance?.[button.dataset.type] ?? MATERIAL_FALLBACK[key]?.resistance?.[button.dataset.type] ?? 1) * 100)}%`).join(' / ')}. Rocket boost increases concrete and steel damage.` : `Unlocks in level ${CRACKERS[button.dataset.type]?.unlockLevel || 1}`;
    });
    const projectileType = physics.projectile?.plugin?.type || selected;
    const guideType = projectileType === 'rocket' && physics.projectile?.plugin?.activated ? 'boostedRocket' : selected;
    if (this.matchupSignature !== guideType) {
      this.matchupSignature = guideType;
      set('matchup-title', `${guideType === 'boostedRocket' ? 'BOOSTED ROCKET' : CRACKERS[selected]?.name || selected} / DAMAGE`);
      document.getElementById('matchup-materials').innerHTML = Object.entries(materials()).map(([key, material]) => {
        const strength = material.resistance?.[guideType] ?? MATERIAL_FALLBACK[key]?.resistance?.[guideType] ?? 1;
        return `<span class="matchup-material ${strength >= 1 ? 'strong-match' : strength < .5 ? 'weak-match' : ''}" title="${escapeHTML(material.displayname || material.displayName || material.name || MATERIAL_FALLBACK[key]?.displayname)}: ${material.health || material.hp || MATERIAL_FALLBACK[key]?.health} HP. ${Math.round(strength * 100)}% of base damage"><i class="${key}-swatch"></i>${escapeHTML(material.displayname || material.displayName || material.name || MATERIAL_FALLBACK[key]?.displayname)} <b>${Math.round(strength * 100)}%</b></span>`;
      }).join('');
      set('matchup-tip', ({rocket:'TAP BOOST FOR CONCRETE + STEEL',boostedRocket:'PRECISION BREAKER: AIM FOR ONE SUPPORT',sutli:'WIDE BLAST / GREAT AGAINST BRICK',chakri:'ROLL LOW / BEST AGAINST WOOD',ladi:'SEVEN POPS / BEST AGAINST WOOD'})[guideType]);
    }
    const ability = document.getElementById('ability-button');
    const active = physics.status === 'flight';
    const used = Boolean(physics.projectile?.plugin?.activated);
    ability.hidden = !active;
    ability.disabled = used;
    const abilityKey = `${projectileType}:${used}`;
    if (ability.dataset.crackerType !== abilityKey) {
      ability.dataset.crackerType = abilityKey;
      ability.innerHTML = `${(used ? { rocket: 'BOOST USED', sutli: 'BOMB LIT', chakri: 'SPINNING', ladi: 'FUSE LIT' } : { rocket: 'BOOST ROCKET', sutli: 'BURST THE BOMB', chakri: 'SPIN UP', ladi: 'LIGHT THE LADI' })[projectileType]} ${used ? '✓' : icon('arrow')}`;
    }
    set('shot-instruction', active ? used ? 'ABILITY ACTIVE / INCOMING!' : 'TAP IN FLIGHT / SPACE' : physics.status === 'settling' ? 'WAIT FOR THE DUST TO SETTLE…' : ready ? 'DRAG. AIM. RELEASE.' : 'WHAT A DHAMAKA!');
    this.updateToggles();
    if (this.screenName === 'levels' && this.levelSignature !== JSON.stringify([this.state.save.unlocked, this.state.save.best])) this.renderLevels();
  }

  updateToggles() {
    for (const type of ['music', 'sound']) {
      const enabled = this.state.save[type] !== false;
      const button = document.getElementById(`${type}-toggle`);
      if (button.dataset.enabled === String(enabled)) continue;
      button.dataset.enabled = String(enabled);
      button.classList.toggle('is-muted', !enabled);
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', `Turn ${type === 'sound' ? 'sound effects' : 'music'} ${enabled ? 'off' : 'on'}`);
      button.innerHTML = icon(type === 'music' ? (enabled ? 'music' : 'musicOff') : (enabled ? 'sound' : 'mute'));
    }
  }

  /** On phones the hint and damage readout fade out after a moment (styles.css). */
  flashTips(ms = 4500) {
    this.root.dataset.tips = 'show';
    clearTimeout(this.tipsTimer);
    this.tipsTimer = setTimeout(() => { this.root.dataset.tips = 'hide'; }, ms);
  }

  showScreen(name, data = {}) {
    if (name === 'play' && this.screenName !== 'play') this.flashTips();
    this.root.dataset.aiming = 'false';
    if (data.save) this.state.save = data.save;
    this.applyUIScale(this.state.save.uiScale);
    if (name !== 'play') {
      clearTimeout(this.toastTimer);
      document.getElementById('toast')?.classList.remove('is-visible');
    }
    this.screenName = name;
    this.screenData = data;
    this.root.dataset.screen = name;
    const settingsPrevious = this.settingsReturn?.name;
    const gameplay = ['play', 'pause', 'result', 'unlock'].includes(name) || (name === 'help' && this.helpReturn === 'play') || (name === 'settings' && (['play','pause','result','unlock'].includes(settingsPrevious) || (settingsPrevious === 'help' && this.helpReturn === 'play')));
    this.root.dataset.gameplay = String(gameplay);
    document.getElementById('game-hud').hidden = !gameplay;
    document.getElementById('cracker-toolbar').hidden = !gameplay;
    document.getElementById('level-hint').hidden = name !== 'play';
    document.getElementById('cracker-matchup').hidden = name !== 'play';
    this.layer.className = `screen-layer screen-${name}`;
    this.layer.hidden = name === 'play';
    this.layer.innerHTML = '';
    if (name === 'start') this.renderStart();
    if (name === 'levels') this.renderLevels();
    if (name === 'pause') this.renderPause();
    if (name === 'result') this.renderResult(data);
    if (name === 'unlock') this.renderUnlock(data);
    if (name === 'help') this.renderHelp();
    if (name === 'settings') this.renderSettings();
    this.renderIcons();
    this.queueLayoutMeasurement();
  }

  renderSettings() {
    this.layer.innerHTML = `<section class="modal-card settings-card" role="dialog" aria-modal="true" aria-labelledby="settings-heading"><button class="icon-button modal-close" data-action="close-settings" aria-label="Close settings">${icon('close')}</button><h2 id="settings-heading">Make it <span>your size.</span></h2><p>Adjust the text and buttons to suit your screen.</p><div class="ui-size-label"><label for="ui-scale-slider">UI SIZE</label><output id="ui-scale-value" for="ui-scale-slider" aria-live="polite"></output></div><div class="ui-size-controls"><button class="icon-button" data-action="ui-smaller" aria-label="Decrease UI size">${icon('minus')}</button><input id="ui-scale-slider" type="range" min="1" max="5" step="1" value="3" aria-describedby="ui-size-description"><button class="icon-button" data-action="ui-larger" aria-label="Increase UI size">${icon('plus')}</button></div><div class="ui-size-ticks" aria-hidden="true"><span>SMALLER</span><span>LARGER</span></div><p id="ui-size-description" class="settings-note">Changes apply instantly and are saved on this device.</p><div class="settings-footer"><button class="button button-primary" data-action="close-settings">LOOKS GOOD ${icon('arrow')}</button></div></section>`;
    this.applyUIScale(this.state.save.uiScale);
  }

  renderStart() {
    const saved = (this.state.save.unlocked || 1) > 1;
    this.layer.innerHTML = `
      <section class="start-content">
        <div class="eyebrow hero-eyebrow"><span class="live-dot"></span> THE DIWALI DESTRUCTION CLUB</div>
        <h1>PATAKHA<br><span>PANIC<span class="title-spark">✦</span></span></h1>
        <p class="hero-tagline">Aim. Ignite.<br>Bring the house down.</p>
        <p class="hero-description">Four firecrackers. Twelve skylines.<br>One very satisfying way to celebrate.</p>
        <div class="hero-buttons"><button class="button button-primary" data-action="start">${saved ? 'LET’S KEEP GOING' : 'LET’S MAKE SOME NOISE'}${icon('arrow')}</button><button class="button button-outline" data-action="levels" aria-label="Choose a level">${icon('grid')}LEVELS</button></div>
        <div class="hero-controls"><span class="drag-symbol">↙</span><span>Drag back. Release. Enjoy the chaos.</span></div>
      </section>
      <div class="hero-scene-label"><span class="scene-pill">A FESTIVAL OF PHYSICS</span><span class="scene-scribble">Find the weak spot.<br><b>Make the big shot.</b><span>↗</span></span></div>
      <footer class="start-footer"><span><i class="footer-star">✦</i> HAPPY DIWALI, HIGH SCORES</span><div class="start-crackers">${TYPES.map(type => mini(type)).join('')}<span>MEET YOUR<br>FIREPOWER</span></div><span>${LEVELS.length} LEVELS <i>•</i> 4 CRACKERS <i>•</i> ENDLESS DHAMAKA</span></footer>`;
  }

  renderLevels() {
    const { unlocked = 1, best = {} } = this.state.save;
    this.levelSignature = JSON.stringify([unlocked, best]);
    this.layer.innerHTML = `<section class="level-select"><div class="section-heading"><div><span class="eyebrow">ONE CITY. TWELVE WAYS TO LIGHT IT UP.</span><h2>Pick your <span>playground.</span></h2></div><button class="icon-button" data-action="start-back" aria-label="Back to start">${icon('close')}</button></div><div class="level-grid">${LEVELS.map((level, i) => {
      const locked = level.id > unlocked;
      const record = best[level.id];
      return `<button class="level-card location-${Math.floor(i / 2)} ${locked ? 'is-locked' : ''}" data-level="${level.id}" ${locked ? 'disabled' : ''} aria-label="${escapeHTML(level.name)}, ${locked ? 'locked' : `${record?.diyas || 0} of 3 diyas`}"><div class="level-card-top"><span class="level-number">${String(level.id).padStart(2, '0')}</span><span class="level-unlock-icon">${icon(locked ? 'lock' : 'arrow')}</span></div><div class="level-city" aria-hidden="true"><i></i><i></i><i></i><i></i><span>✦</span></div><span class="level-location">${escapeHTML(level.location || ['Gully Warm-Up','Terrace Trouble','Bazaar Blast','Skyline Showdown','Midnight Mela','Grand Finale'][Math.floor(i / 2)])}</span><strong>${escapeHTML(level.name)}</strong><div class="level-card-bottom"><span class="small-diyas">${[0, 1, 2].map(n => diya((record?.diyas || 0) > n, n)).join('')}</span><span>${locked ? 'COMPLETE PREVIOUS' : record ? formatScore(record.score) + ' BEST' : level.shots + ' SHOTS'}</span></div></button>`;
    }).join('')}</div><p class="level-select-note"><span>✦</span> Clear 90% of a skyline to unlock the next. Bring the house down with fewer shots for more diyas.</p></section>`;
    this.renderIcons();
  }

  renderPause() {
    this.layer.innerHTML = `<section class="modal-card pause-card" role="dialog" aria-modal="true" aria-labelledby="pause-heading"><span class="eyebrow">EVEN FIREWORKS NEED A BREATHER</span><h2 id="pause-heading">Hold that <span>spark.</span></h2><p>Your next perfect shot can wait a moment.</p><button class="button button-primary" data-action="resume">${icon('play')}BACK TO THE DHAMAKA</button><div class="modal-secondary"><button class="button button-outline" data-action="restart">${icon('restart')}RESTART</button><button class="button button-outline" data-action="menu">${icon('grid')}LEVELS</button></div><button class="text-button" data-action="help">A quick refresher ${icon('arrow')}</button></section>`;
  }

  renderResult(data) {
    const level = data.level || this.state.level || LEVELS[0];
    const won = Boolean(data.won);
    const count = Math.max(0, Math.min(3, data.diyas || 0));
    const title = won ? (count === 3 ? 'Full paisa <span>vasool!</span>' : 'Kya shot <span>hai!</span>') : 'One more <span>spark?</span>';
    const next = level.id < LEVELS.length;
    this.layer.innerHTML = `<section class="modal-card result-card ${won ? 'result-won' : 'result-lost'}" role="dialog" aria-modal="true" aria-labelledby="result-heading"><span class="eyebrow">${won ? 'SKYLINE CLEARED · ' : 'SO CLOSE · '}${escapeHTML(level.name).toUpperCase()}</span><h2 id="result-heading">${title}</h2><div class="result-diyas" aria-label="${count} out of 3 diyas">${[0, 1, 2].map(n => diya(n < count, n)).join('')}</div><p>${won ? (count === 3 ? 'A perfect little festival of falling bricks.' : 'That skyline had it coming. Can you do it in fewer shots?') : 'Find the weak point. Try a new angle. Let gravity help.'}</p><div class="result-stats"><div><span>DESTRUCTION</span><strong>${Math.round(data.progress || 0)}<small>%</small></strong></div><div><span>SCORE</span><strong>${formatScore(data.score)}</strong></div><div><span>SHOTS LEFT</span><strong>${data.remaining ?? 0}</strong></div></div><button class="button button-primary" data-action="${won && next ? 'next' : won ? 'menu' : 'restart'}">${won && next ? 'NEXT SKYLINE' : won ? 'ALL TWELVE. ALL LIT UP.' : 'TRY THAT SHOT AGAIN'}${icon(won ? 'arrow' : 'restart')}</button><div class="modal-secondary">${won ? `<button class="button button-outline" data-action="restart">${icon('restart')}GO FOR THREE DIYAS</button>` : ''}<button class="button button-outline" data-action="menu">${icon('grid')}LEVELS</button></div><span class="result-tip">${won ? 'LOCAL BESTS SAVED. BRAGGING RIGHTS EARNED.' : '90% DESTRUCTION TO CLEAR THE LEVEL'}</span></section>`;
  }

  renderUnlock(data) {
    const type = data.type || 'rocket';
    const cracker = CRACKERS[type] || CRACKERS.rocket;
    const tips = {
      rocket: ['PRECISION WITH A PUNCH', 'Aim for a weak support. Tap mid-flight to boost your rocket through it.', 'DRAG TO AIM → RELEASE → TAP TO BOOST'],
      sutli: ['SMALL PACKAGE. BIG DHAMAKA.', 'A wide blast for heavy buildings. Land it between supports and watch the whole structure go.', 'RELEASE TO LAUNCH → IMPACT TO EXPLODE'],
      chakri: ['KEEP THE GOOD TIMES ROLLING', 'This spinning firecracker rolls along the ground and chews through the base of a building. Aim low.', 'AIM LOW → RELEASE → ROLL THROUGH SUPPORTS'],
      ladi: ['ONE FUSE. A WHOLE CHAIN REACTION.', 'A string of little explosions travels across the skyline. Perfect for tightly packed shops.', 'LAND BETWEEN BUILDINGS → LET THE CHAIN BEGIN'],
    };
    this.layer.innerHTML = `<section class="modal-card unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-heading"><span class="eyebrow"><span class="live-dot"></span> NEW FIREPOWER UNLOCKED</span><div class="unlock-art" style="--cracker-color:${cracker.color || '#ffbc49'}">${mini(type)}<span>✦</span><span>✦</span><span>✧</span></div><h2 id="unlock-heading">Meet the <span>${escapeHTML(cracker.name)}.</span></h2><strong class="unlock-kicker">${tips[type][0]}</strong><p>${tips[type][1]}</p><div class="unlock-sequence">${tips[type][2]}</div><button class="button button-primary" data-action="close-unlock">LET’S LIGHT IT UP ${icon('arrow')}</button></section>`;
  }

  renderHelp() {
    this.layer.innerHTML = `<section class="help-card modal-card" role="dialog" aria-modal="true" aria-labelledby="help-heading"><button class="icon-button modal-close" data-action="close-help" aria-label="Close how to play">${icon('close')}</button><span class="eyebrow">A LITTLE AIM GOES A LONG WAY</span><h2 id="help-heading">Make some <span>beautiful chaos.</span></h2><div class="help-steps"><div><span class="help-step-symbol">↙</span><strong>01 / PULL BACK</strong><p>Drag backwards from the rooftop launcher. The dotted arc shows where your shot is going.</p></div><div><span class="help-step-symbol">↗</span><strong>02 / LET IT FLY</strong><p>Release to launch. Tap during flight or press Space to activate the special ability.</p></div><div><span class="help-step-symbol">✦</span><strong>03 / BRING IT DOWN</strong><p>Remove weak supports, trigger a collapse and destroy 90% to win. Use fewer shots for three diyas.</p></div></div><div class="material-guide"><div class="material-guide-heading"><strong>MATERIAL MATCHUPS</strong><span>Base damage multiplier. Higher = stronger. Boost before impact.</span></div><div class="material-table-wrap"><table><thead><tr><th>MATERIAL / HP</th><th>ROCKET</th><th>BOOST</th><th>SUTLI</th><th>CHAKRI</th><th>LADI</th></tr></thead><tbody>${Object.entries(materials()).map(([key, material]) => `<tr><th><i class="${key}-swatch"></i>${escapeHTML(material.displayname || material.displayName || material.name || MATERIAL_FALLBACK[key]?.displayname)} <small>${material.health || material.hp || MATERIAL_FALLBACK[key]?.health} HP</small></th>${['rocket','boostedRocket','sutli','chakri','ladi'].map(type => {const n=material.resistance?.[type] ?? MATERIAL_FALLBACK[key]?.resistance?.[type] ?? 1;return `<td class="${n>=1?'strong-match':n<.5?'weak-match':''}">${n.toFixed(2).replace(/0$/, '')}×</td>`;}).join('')}</tr>`).join('')}</tbody></table></div></div><div class="help-crackers">${TYPES.map(type => `<div>${mini(type)}<strong>${escapeHTML(CRACKERS[type]?.name || type)}</strong><span>${escapeHTML(CRACKERS[type]?.description || '')}</span></div>`).join('')}</div><div class="help-footer"><span>MOUSE / TOUCH TO AIM <i>•</i> SPACE TO ACTIVATE <i>•</i> 1–4 TO SELECT</span><button class="button button-primary" data-action="close-help">GOT IT ${icon('arrow')}</button></div></section>`;
  }

  toast(message) {
    const node = document.getElementById('toast');
    clearTimeout(this.toastTimer);
    node.textContent = message;
    node.classList.remove('is-visible');
    void node.offsetWidth;
    node.classList.add('is-visible');
    this.toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2700);
  }
}

