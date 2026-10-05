import './styles.css';
import {GamePhysics, predictTrajectory} from './physics.js';
import {LEVELS, CRACKERS} from './levels.js';
import {SceneRenderer} from './art.js';
import {GameUI} from './ui.js';
import {GameAudio} from './audio.js';
import {loadSave, writeSave, awardDiyas, recordResult, normalizeUIScale} from './progress.js';
import {WORLD} from './config.js';

const LAUNCHER = WORLD.launcher;
let save = loadSave();
let level = LEVELS[0];
let selected = 'rocket';
let mode = 'start';
let aim = null;
let renderer, physics;
let time = 0;
let slowMotion = 0;
let resultShown = false;
let celebrating = false;
let pointerId = null;
let lastHud = 0;
let keyboardPull = {x:-100,y:30};
const audio = new GameAudio();

function persist() { writeSave(save); }
function cancelAim() {
  const capturedPointer = pointerId;
  pointerId = null;
  aim = null;
  const surface = document.getElementById('game-canvas');
  if (capturedPointer !== null && surface?.hasPointerCapture(capturedPointer)) {
    surface.releasePointerCapture(capturedPointer);
  }
  document.getElementById('app').dataset.aiming = 'false';
}
function setUIScale(value) {
  cancelAim();
  save.uiScale = normalizeUIScale(value);
  persist();
  updateUI();
  renderer?.resize();
}
function setAudio(name, enabled) {
  unlockAudio();
  save[name] = typeof enabled === 'boolean' ? enabled : !save[name];
  name === 'music' ? audio.setMusic(save.music) : audio.setSound(save.sound);
  persist();
  updateUI();
}

const ui = new GameUI({
  start: () => startLevel(Math.min(save.unlocked,LEVELS.length)),
  level: id => { if (id <= save.unlocked) startLevel(id); },
  select: type => {
    if (mode === 'play' && physics.getState().status === 'ready' && level.unlockedTypes.includes(type)) {
      selected = type; aim = null; updateUI();
    }
  },
  pause: pause,
  resume: resume,
  restart: () => startLevel(level.id),
  next: () => level.id < LEVELS.length ? startLevel(level.id + 1) : showLevels(),
  menu: showLevels,
  music: enabled => setAudio('music',enabled),
  sound: enabled => setAudio('sound',enabled),
  uiScale: setUIScale,
  home: () => { cancelAim();mode='start';ui.showScreen('start',{save});updateUI(); },
  ability: activate,
  help: () => { if (mode === 'play') pause('help'); else ui.showScreen('help',{onClose:()=>ui.showScreen(mode)}); },
  landscape: () => { unlockAudio(); enterFullscreen(true); },
});

// The cracker tray covers the bottom of the screen during play; the renderer
// keeps street level just above it.
const tray = document.getElementById('cracker-toolbar');
renderer = new SceneRenderer(ui.canvas || document.getElementById('game-canvas'), {
  bottomInset: () => {
    if (!tray || tray.hidden) return 0;
    const box = tray.getBoundingClientRect(), stage = tray.offsetParent?.getBoundingClientRect();
    return box.height && stage ? stage.bottom - box.top + 6 : 0;
  },
});
physics = new GamePhysics(level, onEvent);
audio.setMusic(save.music);
audio.setSound(save.sound);
ui.showScreen('start', {save});
updateUI();

function updateUI() {
  ui.update({level,physics:physics.getState(),selected,save});
}

// Phones hide the browser's address and status bars by going full screen and
// locking landscape. Browsers only allow this inside a tap, so game buttons
// call it; iPhone Safari has no page full screen and simply ignores it.
const touchScreen = window.matchMedia('(pointer: coarse)');
function enterFullscreen(always = false) {
  const root = document.documentElement;
  if ((!always && !touchScreen.matches) || document.fullscreenElement || !root.requestFullscreen) return;
  root.requestFullscreen({navigationUI:'hide'})
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

function unlockAudio() {
  audio.unlock();
  const video = document.querySelector('video');
  if (video?.paused) video.play().catch(()=>{});
}

function startLevel(id) {
  enterFullscreen();
  unlockAudio();
  level = LEVELS.find(l => l.id === Number(id)) || LEVELS[0];
  physics.load(level);
  selected = level.unlockedTypes.at(-1) || 'rocket';
  cancelAim();
  resultShown = false;
  celebrating = false;
  slowMotion = 0;
  mode = 'play';
  ui.showScreen('play');
  updateUI();
  const newlyUnlocked = level.unlockedTypes.find(t => !save.seen.includes(t));
  if (newlyUnlocked) {
    mode = 'unlock';
    ui.showScreen('unlock',{type:newlyUnlocked,onClose:()=>{
      if (!save.seen.includes(newlyUnlocked)) save.seen.push(newlyUnlocked);
      persist(); mode='play'; ui.showScreen('play'); updateUI();
    }});
  }
}

function showLevels() {
  enterFullscreen();
  cancelAim(); mode = 'levels';
  ui.showScreen('levels',{save}); updateUI();
}

function pause(screen='pause') {
  if (mode !== 'play') return;
  cancelAim(); mode = screen;
  ui.showScreen(screen,{onClose:resume});
}

function resume() {
  enterFullscreen();
  unlockAudio(); mode='play'; ui.showScreen('play'); updateUI();
}

function activate() {
  if (mode==='play') { unlockAudio(); physics.activate(); updateUI(); }
}

function onEvent(event) {
  if (!renderer) return;
  renderer.addEffect(event);
  if (event.type === 'launch') audio.play('launch');
  if (event.type === 'ability') audio.play(event.cracker || event.firecracker || selected);
  if (event.type === 'explosion') audio.play(event.cracker || event.firecracker || selected);
  if (event.type === 'damage') audio.play('crumble');
  if (event.type === 'combo') {
    audio.play('combo');
    if (event.slowMotion) slowMotion=450;
    ui.toast(event.message || `Dhamaka x${event.combo || 3}!`);
  }
  if (event.message && event.type !== 'combo') ui.toast(event.message);
}

function finish(state) {
  if (resultShown) return;
  resultShown=true;
  aim=null;
  const won = state.status === 'won';
  const diyas=awardDiyas(state,level);
  const result={won,score:state.score,progress:state.progress,diyas,remaining:state.remaining,level,best:save.best[level.id]};
  recordResult(save,level,result); persist();
  if (won) {
    audio.play('win');
    celebrating=diyas===3;
    if (celebrating) renderer.celebrate();
  }
  mode='result'; ui.showScreen('result',result); updateUI();
}

const canvas=ui.canvas || document.getElementById('game-canvas');
function worldPoint(e) {
  if (renderer.toWorld) return renderer.toWorld(e.clientX,e.clientY);
  const rect=canvas.getBoundingClientRect();
  const scale=Math.min(rect.width/WORLD.width,rect.height/WORLD.height);
  return {x:(e.clientX-rect.left-(rect.width-WORLD.width*scale)/2)/scale,y:(e.clientY-rect.top-(rect.height-WORLD.height*scale)/2)/scale};
}

function makeAim(point) {
  let pull={x:Math.min(-6,point.x-LAUNCHER.x),y:point.y-LAUNCHER.y};
  let length=Math.hypot(pull.x,pull.y);
  if (length>WORLD.maxPull) {pull.x*=WORLD.maxPull/length;pull.y*=WORLD.maxPull/length;}
  pull.y=Math.max(-70,Math.min(110,pull.y));
  const speedScale=WORLD.maxSpeed/WORLD.maxPull;
  const velocity={x:-pull.x*speedScale,y:-pull.y*speedScale};
  return {pull,velocity,points:predictTrajectory(velocity),power:Math.min(100,Math.round(Math.hypot(pull.x,pull.y)/WORLD.maxPull*100))};
}

canvas.addEventListener('pointerdown',e=>{
  if (mode!=='play') return;
  unlockAudio();
  const state=physics.getState();
  if (state.status==='flight') { activate(); return; }
  if (state.status!=='ready') return;
  const point=worldPoint(e);
  if (Math.hypot(point.x-LAUNCHER.x,point.y-LAUNCHER.y)>115) return;
  pointerId=e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  aim=makeAim(point);
  e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if (e.pointerId===pointerId && mode==='play') {aim=makeAim(worldPoint(e));e.preventDefault();}
});
canvas.addEventListener('pointerup',e=>{
  if (e.pointerId!==pointerId) return;
  pointerId=null;
  if (mode==='play' && aim && Math.hypot(aim.pull.x,aim.pull.y)>18) physics.launch(selected,aim.velocity);
  aim=null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  updateUI();
});
canvas.addEventListener('pointercancel',()=>{pointerId=null;aim=null;});

window.addEventListener('keydown',e=>{
  if (e.code === 'Escape' && ui.screenName === 'settings') {
    e.preventDefault(); ui.closeSettings(); return;
  }
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.code==='Escape') { if (mode==='play') pause(); else if (mode==='pause'||mode==='help') resume(); }
  if (mode!=='play') return;
  if (e.code==='KeyR') {startLevel(level.id);return;}
  const state=physics.getState();
  if (/^Digit[1-4]$/.test(e.code)) {
    const type=['rocket','sutli','chakri','ladi'][Number(e.code.at(-1))-1];
    if(state.status==='ready' && level.unlockedTypes.includes(type)){selected=type;updateUI();}
  }
  if (e.code==='Space') {
    e.preventDefault(); unlockAudio();
    if(state.status==='flight')activate();
    else if(state.status==='ready'){const shot=aim||makeAim({x:LAUNCHER.x+keyboardPull.x,y:LAUNCHER.y+keyboardPull.y});physics.launch(selected,shot.velocity);aim=null;updateUI();}
  }
  if (state.status==='ready' && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    e.preventDefault();
    if(e.code==='ArrowUp')keyboardPull.y+=5;
    if(e.code==='ArrowDown')keyboardPull.y-=5;
    if(e.code==='ArrowLeft')keyboardPull.x-=5;
    if(e.code==='ArrowRight')keyboardPull.x+=5;
    keyboardPull.x=Math.max(-120,Math.min(-25,keyboardPull.x));
    keyboardPull.y=Math.max(-60,Math.min(100,keyboardPull.y));
    aim=makeAim({x:LAUNCHER.x+keyboardPull.x,y:LAUNCHER.y+keyboardPull.y});
  }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden && mode==='play')pause();});
// Touch devices in portrait see the rotate gate (styles.css); freeze the level behind it.
const portraitGate=window.matchMedia('(orientation: portrait) and (pointer: coarse)');
portraitGate.addEventListener('change',()=>{
  if(!portraitGate.matches)return;
  cancelAim();
  if(mode==='play')pause();
});
let canvasSize = canvas.getBoundingClientRect();
function resizeScene() {
  const nextSize = canvas.getBoundingClientRect();
  if (nextSize.width !== canvasSize.width || nextSize.height !== canvasSize.height) cancelAim();
  canvasSize = nextSize;
  renderer.resize();
}
window.addEventListener('resize',resizeScene);
const sceneObserver = new ResizeObserver(resizeScene);
sceneObserver.observe(canvas);
if (tray) sceneObserver.observe(tray);

let previous=performance.now();
function frame(now) {
  const dt=Math.min(50,now-previous);previous=now;time+=dt;
  slowMotion=Math.max(0,slowMotion-dt);
  // The scene keeps playing out behind the result screen.
  if (mode==='play' || mode==='result') physics.update(dt*(slowMotion>0?.45:1));
  const state=physics.getState();
  if(mode==='play' && (state.status==='won'||state.status==='lost'))finish(state);
  renderer.render({physics:state,level,time,aim,selected,events:[],mode,celebrating},dt);
  if(now-lastHud>70){updateUI();lastHud=now;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if(import.meta.env.DEV) window.__patakha={
  getState:()=>({mode,selected,level:level.id,save,physics:physics.getState(),aim}),
  get physics(){return physics;}, renderer,ui,startLevel,
};
