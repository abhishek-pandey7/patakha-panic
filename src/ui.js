import { LEVELS, CRACKERS } from './levels.js';
import { drawCracker, crackerAtlasReady } from './art.js';

const TYPES = ['rocket', 'sutli', 'chakri', 'ladi'];
const formatScore = (value) => Math.round(value || 0).toLocaleString('en-IN');
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ICONS = {
  play: '<path d="m9 5 12 7-12 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  restart: '<path d="M5 9a8 8 0 1 1-1 6M5 3v6h6"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4ZM17 8c3 2 3 6 0 8M20 5c5 4 5 10 0 14"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4ZM17 9l5 6M22 9l-5 6"/>',
  music: '<path d="M9 17V5l12-2v12M9 8l12-2"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/><ellipse cx="17.5" cy="16" rx="3.5" ry="3"/>',
  musicOff: '<path d="M9 17V5l12-2v8M9 8l12-2M17 14l6 6M23 14l-6 6"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.arrow}</svg>`;
const diya = (lit = true, index = 0) => `<span class="diya ${lit ? 'is-lit' : ''}" style="--i:${index}" aria-hidden="true"><span class="diya-flame"></span><span class="diya-bowl"></span></span>`;
const mini = (type, cls = '') => `<canvas class="cracker-icon ${cls}" data-cracker="${type}" width="160" height="120" aria-hidden="true"></canvas>`;

/** DOM interface for the game. Simulation and transitions remain in main.js. */
export class GameUI {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.state = { save: { unlocked: 1, best: {}, music: true, sound: true }, selected: 'rocket', level: LEVELS[0], physics: {} };
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
          </div>
        </header>
        <section id="game-hud" class="game-hud" aria-label="Level status" hidden>
          <div class="hud-location"><span id="hud-level-number" class="eyebrow">LEVEL 01 / 08</span><strong id="hud-level-name">Gully Warm-Up</strong></div>
          <div class="hud-stat"><span class="eyebrow">SCORE</span><strong id="hud-score">0</strong></div>
          <div class="destruction-box"><div class="meter-label"><span>DESTRUCTION</span><strong id="hud-progress">0<span>%</span></strong></div><div class="destruction-track"><span id="destruction-fill"></span><i title="90% to win"></i></div></div>
          <button class="icon-button" data-action="restart" aria-label="Restart level" title="Restart">${icon('restart')}</button>
          <button class="icon-button" data-action="pause" aria-label="Pause game" title="Pause">${icon('pause')}</button>
        </section>
        <div id="level-hint" class="level-hint" hidden><span>✦</span><span id="level-hint-text"></span></div>
        <section id="cracker-toolbar" class="cracker-toolbar" aria-label="Choose firecracker" hidden>
          <div class="ammo-count"><strong id="hud-remaining">3</strong><span>SHOTS<br>LEFT</span></div>
          <div class="cracker-tray">${TYPES.map((type, i) => `<button class="cracker-card" data-type="${type}" aria-label="Choose ${escapeHTML(CRACKERS[type]?.name || type)}">${mini(type)}<span class="cracker-card-copy"><span class="cracker-name">${escapeHTML(CRACKERS[type]?.name || type)}</span><span class="cracker-role">${['Precision', 'Big blast', 'Base breaker', 'Chain reaction'][i]}</span></span><span class="cracker-key">${i + 1}</span><span class="cracker-lock">${icon('lock')}</span></button>`).join('')}</div>
          <div class="shot-status"><span id="shot-instruction">DRAG. AIM. RELEASE.</span><button id="ability-button" class="ability-button" data-action="ability" hidden>BOOST ${icon('arrow')}</button></div>
        </section>
        <div id="screen-layer" class="screen-layer"></div>
        <div id="toast" class="game-toast" role="status" aria-live="polite"></div>
        <div class="portrait-nudge" aria-hidden="true"><span>↻</span>More skyline, more dhamaka.<small>Turn your phone sideways for the best view.</small></div>
      </main>`;
    this.canvas = document.getElementById('game-canvas');
    this.layer = document.getElementById('screen-layer');
    this.video = document.getElementById('festival-video');
    this.video.muted = true;
    this.video.play().catch(() => {});
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('pointerdown', () => this.video.play().catch(() => {}), { once: true });
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
    if (target.matches('.cracker-card') && target.dataset.type) { this.callbacks.select?.(target.dataset.type); return; }
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
    if (action === 'close-help') {
      const name = this.helpReturn || 'start';
      this.showScreen(name);
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
    this.helpReturn = this.screenName === 'help' ? (this.helpReturn || 'start') : this.screenName;
    if (this.helpReturn === 'play') this.callbacks.pause?.();
    this.showScreen('help');
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
    const { level, physics = {}, selected = 'rocket' } = this.state;
    const set = (id, text) => { const node = document.getElementById(id); if (node && node.textContent !== String(text)) node.textContent = text; };
    set('hud-level-number', `LEVEL ${String(level?.id || 1).padStart(2, '0')} / 08`);
    set('hud-level-name', level?.name || 'Gully Warm-Up');
    set('hud-score', formatScore(physics.score));
    const progress = Math.max(0, Math.min(100, Math.round(physics.progress || 0)));
    const progressLabel = document.getElementById('hud-progress');
    if (progressLabel.dataset.value !== String(progress)) {
      progressLabel.dataset.value = String(progress);
      progressLabel.innerHTML = `${progress}<span>%</span>`;
    }
    document.getElementById('destruction-fill').style.width = `${progress}%`;
    document.getElementById('destruction-fill').classList.toggle('is-complete', progress >= 90);
    set('hud-remaining', physics.remaining ?? level?.shots ?? 3);
    set('level-hint-text', level?.hint || 'Find the weak point. Let gravity do the rest.');
    const ready = physics.status === 'ready' || !physics.status;
    this.root.querySelectorAll('.cracker-card').forEach((button) => {
      const allowed = level?.unlockedTypes?.includes(button.dataset.type) ?? true;
      button.classList.toggle('is-selected', button.dataset.type === selected);
      button.classList.toggle('is-locked', !allowed);
      button.disabled = !allowed || !ready;
      button.setAttribute('aria-pressed', String(button.dataset.type === selected));
      button.title = allowed ? CRACKERS[button.dataset.type]?.description || '' : `Unlocks in level ${CRACKERS[button.dataset.type]?.unlockLevel || 1}`;
    });
    const projectileType = physics.projectile?.plugin?.type || selected;
    const ability = document.getElementById('ability-button');
    const active = physics.status === 'flight';
    ability.hidden = !active;
    if (ability.dataset.crackerType !== projectileType) {
      ability.dataset.crackerType = projectileType;
      ability.innerHTML = `${({ rocket: 'BOOST ROCKET', sutli: 'BURST THE BOMB', chakri: 'SPIN UP', ladi: 'LIGHT THE LADI' })[projectileType]} ${icon('arrow')}`;
    }
    set('shot-instruction', active ? 'TAP IN FLIGHT / SPACE' : physics.status === 'settling' ? 'WAIT FOR THE DUST TO SETTLE…' : ready ? 'DRAG. AIM. RELEASE.' : 'WHAT A DHAMAKA!');
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

  showScreen(name, data = {}) {
    if (data.save) this.state.save = data.save;
    if (name !== 'play') {
      clearTimeout(this.toastTimer);
      document.getElementById('toast')?.classList.remove('is-visible');
    }
    this.screenName = name;
    this.screenData = data;
    this.root.dataset.screen = name;
    const gameplay = ['play', 'pause', 'result', 'unlock'].includes(name) || (name === 'help' && this.helpReturn === 'play');
    document.getElementById('game-hud').hidden = !gameplay;
    document.getElementById('cracker-toolbar').hidden = !gameplay;
    document.getElementById('level-hint').hidden = name !== 'play';
    this.layer.className = `screen-layer screen-${name}`;
    this.layer.hidden = name === 'play';
    this.layer.innerHTML = '';
    if (name === 'start') this.renderStart();
    if (name === 'levels') this.renderLevels();
    if (name === 'pause') this.renderPause();
    if (name === 'result') this.renderResult(data);
    if (name === 'unlock') this.renderUnlock(data);
    if (name === 'help') this.renderHelp();
    this.renderIcons();
  }

  renderStart() {
    const saved = (this.state.save.unlocked || 1) > 1;
    this.layer.innerHTML = `
      <section class="start-content">
        <div class="eyebrow hero-eyebrow"><span class="live-dot"></span> THE DIWALI DESTRUCTION CLUB</div>
        <h1>PATAKHA<br><span>PANIC<span class="title-spark">✦</span></span></h1>
        <p class="hero-tagline">Aim. Ignite.<br>Bring the house down.</p>
        <p class="hero-description">Four firecrackers. Eight skylines.<br>One very satisfying way to celebrate.</p>
        <div class="hero-buttons"><button class="button button-primary" data-action="start">${saved ? 'LET’S KEEP GOING' : 'LET’S MAKE SOME NOISE'}${icon('arrow')}</button><button class="button button-outline" data-action="levels" aria-label="Choose a level">${icon('grid')}LEVELS</button></div>
        <div class="hero-controls"><span class="drag-symbol">↙</span><span>Drag back. Release. Enjoy the chaos.</span></div>
      </section>
      <div class="hero-scene-label"><span class="scene-pill">A FESTIVAL OF PHYSICS</span><span class="scene-scribble">Find the weak spot.<br><b>Make the big shot.</b><span>↗</span></span></div>
      <footer class="start-footer"><span><i class="mini-diya"></i> HAPPY DIWALI, HIGH SCORES</span><div class="start-crackers">${TYPES.map(type => mini(type)).join('')}<span>MEET YOUR<br>FIREPOWER</span></div><span>8 LEVELS <i>•</i> 4 CRACKERS <i>•</i> ENDLESS DHAMAKA</span></footer>`;
  }

  renderLevels() {
    const { unlocked = 1, best = {} } = this.state.save;
    this.levelSignature = JSON.stringify([unlocked, best]);
    this.layer.innerHTML = `<section class="level-select"><div class="section-heading"><div><span class="eyebrow">ONE CITY. EIGHT WAYS TO LIGHT IT UP.</span><h2>Pick your <span>playground.</span></h2></div><button class="icon-button" data-action="start-back" aria-label="Back to start">${icon('close')}</button></div><div class="level-grid">${LEVELS.map((level, i) => {
      const locked = level.id > unlocked;
      const record = best[level.id];
      return `<button class="level-card location-${Math.floor(i / 2)} ${locked ? 'is-locked' : ''}" data-level="${level.id}" ${locked ? 'disabled' : ''} aria-label="${escapeHTML(level.name)}, ${locked ? 'locked' : `${record?.diyas || 0} of 3 diyas`}"><div class="level-card-top"><span class="level-number">${String(level.id).padStart(2, '0')}</span><span class="level-unlock-icon">${icon(locked ? 'lock' : 'arrow')}</span></div><div class="level-city" aria-hidden="true"><i></i><i></i><i></i><i></i><span>✦</span></div><span class="level-location">${escapeHTML(level.location || ['Gully Warm-Up','Terrace Trouble','Bazaar Blast','Skyline Showdown'][Math.floor(i / 2)])}</span><strong>${escapeHTML(level.name)}</strong><div class="level-card-bottom"><span class="small-diyas">${[0, 1, 2].map(n => diya((record?.diyas || 0) > n, n)).join('')}</span><span>${locked ? 'COMPLETE PREVIOUS' : record ? formatScore(record.score) + ' BEST' : level.shots + ' SHOTS'}</span></div></button>`;
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
    this.layer.innerHTML = `<section class="modal-card result-card ${won ? 'result-won' : 'result-lost'}" role="dialog" aria-modal="true" aria-labelledby="result-heading"><span class="eyebrow">${won ? 'SKYLINE CLEARED · ' : 'SO CLOSE · '}${escapeHTML(level.name).toUpperCase()}</span><h2 id="result-heading">${title}</h2><div class="result-diyas" aria-label="${count} out of 3 diyas">${[0, 1, 2].map(n => diya(n < count, n)).join('')}</div><p>${won ? (count === 3 ? 'A perfect little festival of falling bricks.' : 'That skyline had it coming. Can you do it in fewer shots?') : 'Find the weak point. Try a new angle. Let gravity help.'}</p><div class="result-stats"><div><span>DESTRUCTION</span><strong>${Math.round(data.progress || 0)}<small>%</small></strong></div><div><span>SCORE</span><strong>${formatScore(data.score)}</strong></div><div><span>SHOTS LEFT</span><strong>${data.remaining ?? 0}</strong></div></div><button class="button button-primary" data-action="${won && next ? 'next' : won ? 'menu' : 'restart'}">${won && next ? 'NEXT SKYLINE' : won ? 'ALL EIGHT. ALL LIT UP.' : 'TRY THAT SHOT AGAIN'}${icon(won ? 'arrow' : 'restart')}</button><div class="modal-secondary">${won ? `<button class="button button-outline" data-action="restart">${icon('restart')}GO FOR THREE DIYAS</button>` : ''}<button class="button button-outline" data-action="menu">${icon('grid')}LEVELS</button></div><span class="result-tip">${won ? 'LOCAL BESTS SAVED. BRAGGING RIGHTS EARNED.' : '90% DESTRUCTION TO CLEAR THE LEVEL'}</span></section>`;
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
    this.layer.innerHTML = `<section class="help-card modal-card" role="dialog" aria-modal="true" aria-labelledby="help-heading"><button class="icon-button modal-close" data-action="close-help" aria-label="Close how to play">${icon('close')}</button><span class="eyebrow">A LITTLE AIM GOES A LONG WAY</span><h2 id="help-heading">Make some <span>beautiful chaos.</span></h2><div class="help-steps"><div><span class="help-step-symbol">↙</span><strong>01 / PULL BACK</strong><p>Drag backwards from the rooftop launcher. The dotted arc shows where your shot is going.</p></div><div><span class="help-step-symbol">↗</span><strong>02 / LET IT FLY</strong><p>Release to launch. Tap during flight or press Space to activate the special ability.</p></div><div><span class="help-step-symbol">✦</span><strong>03 / BRING IT DOWN</strong><p>Remove weak supports, trigger a collapse and destroy 90% to win. Use fewer shots for three diyas.</p></div></div><div class="help-materials"><span><i class="wood-swatch"></i>WOOD <small>Easy to break</small></span><span><i class="brick-swatch"></i>BRICK <small>Good with a blast</small></span><span><i class="concrete-swatch"></i>CONCRETE <small>Drop it from height</small></span></div><div class="help-crackers">${TYPES.map(type => `<div>${mini(type)}<strong>${escapeHTML(CRACKERS[type]?.name || type)}</strong><span>${escapeHTML(CRACKERS[type]?.description || '')}</span></div>`).join('')}</div><div class="help-footer"><span>MOUSE / TOUCH TO AIM <i>•</i> SPACE TO ACTIVATE <i>•</i> 1–4 TO SELECT</span><button class="button button-primary" data-action="close-help">GOT IT ${icon('arrow')}</button></div></section>`;
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
