import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {WORLD} from '../src/config.js';
import {LEVELS,LEVEL_SOLUTIONS} from '../src/levels.js';

const screenshots=path.resolve('test-results');
fs.mkdirSync(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined)});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(process.env.GAME_URL || 'http://localhost:5173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('video').readyState>2 && document.querySelector('video').currentTime>0);
  assert.equal(await page.locator('video').evaluate(v=>new URL(v.currentSrc).pathname.endsWith('/assets/diwali-background.mp4')),true);
  await page.screenshot({path:path.join(screenshots,'start.png')});
  async function openSettings() {
    await page.locator('[data-action="settings"]').click();
    await page.locator('#ui-scale-slider').waitFor({state:'visible'});
  }
  async function setSize(size) {
    const slider=page.locator('#ui-scale-slider');
    await slider.focus();
    await slider.press('Home');
    for(let i=1;i<size;i++)await slider.press('ArrowRight');
    assert.equal(await slider.inputValue(),String(size));
    assert.equal(await page.evaluate(()=>window.__patakha.getState().save.uiScale),size);
  }
  assert.equal(await page.evaluate(()=>window.__patakha.getState().save.uiScale),3);
  const defaultFont=await page.locator('.hero-description').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
  await openSettings();
  await setSize(5);
  assert.equal(await page.locator('[data-action="ui-larger"]').isDisabled(),true);
  await page.locator('[data-action="ui-smaller"]').click();
  assert.equal(await page.locator('#ui-scale-slider').inputValue(),'4');
  await setSize(1);
  assert.equal(await page.locator('[data-action="ui-smaller"]').isDisabled(),true);
  await page.locator('[data-action="ui-larger"]').click();
  assert.equal(await page.locator('#ui-scale-slider').inputValue(),'2');
  await setSize(5);
  await page.locator('#ui-scale-slider').press('Escape');
  assert.equal(await page.evaluate(()=>window.__patakha.ui.screenName),'start');
  assert.ok(await page.locator('.hero-description').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>defaultFont);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>window.__patakha.getState().save.uiScale),5);
  await openSettings();
  assert.equal(await page.locator('#ui-scale-slider').inputValue(),'5');
  await setSize(3);
  await page.locator('[data-action="close-settings"]').first().click();
  await page.getByRole('button',{name:'How to play',exact:true}).click();
  await page.getByRole('button',{name:'GOT IT'}).click();
  await page.getByRole('button',{name:'Choose a level',exact:true}).click();
  assert.equal(await page.locator('.level-card').count(),LEVELS.length);
  assert.equal(await page.locator('.level-card:disabled').count(),LEVELS.length-1);
  await page.locator('[data-level="1"]').click();
  await openSettings();
  await page.locator('[data-action="close-settings"]').first().click();
  assert.equal(await page.evaluate(()=>window.__patakha.ui.screenName),'unlock');
  await page.getByRole('button',{name:'LET’S LIGHT IT UP'}).click();
  await page.getByRole('button',{name:'Pause game',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().mode),'pause');
  await page.getByRole('button',{name:'BACK TO THE DHAMAKA'}).click();
  await page.getByRole('button',{name:'How to play',exact:true}).click();
  await page.getByRole('button',{name:'GOT IT'}).click();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().mode),'play');

  // A viewport change cancels a held drag instead of firing a stale aim.
  const held=await page.evaluate(()=>{
    const renderer=window.__patakha.renderer,r=document.querySelector('#game-canvas').getBoundingClientRect(),v=renderer.viewport;
    return {x:r.x+v.offsetX+190*v.scale,y:r.y+v.offsetY+510*v.scale,pull:70*v.scale};
  });
  await page.mouse.move(held.x,held.y);
  await page.mouse.down();
  await page.mouse.move(held.x-held.pull,held.y+held.pull/3);
  assert.ok(await page.evaluate(()=>window.__patakha.getState().aim));
  await page.setViewportSize({width:1440,height:860});
  await page.waitForFunction(()=>window.__patakha.getState().aim===null);
  await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().physics.shotsUsed),0);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForFunction(()=>document.querySelector('#game-canvas').getBoundingClientRect().height===900);

  const box=await page.locator('#game-canvas').boundingBox();
  const scale=Math.min(box.width/WORLD.width,box.height/WORLD.height);
  const ox=box.x+(box.width-WORLD.width*scale)/2,oy=box.y+(box.height-WORLD.height*scale)/2;
  async function drag(pull) {
    const camera=await page.evaluate(()=>Math.round(window.__patakha.renderer.cameraX/3)*3);
    await page.mouse.move(ox+(WORLD.launcher.x-camera)*scale,oy+WORLD.launcher.y*scale);
    await page.mouse.down();
    await page.mouse.move(ox+(WORLD.launcher.x-camera+pull.x)*scale,oy+(WORLD.launcher.y+pull.y)*scale,{steps:10});
  }
  await drag({x:-24,y:0});
  const weakAim=await page.evaluate(()=>window.__patakha.getState().aim);
  assert.ok(weakAim.power<=21);
  await page.mouse.up();
  await page.waitForFunction(()=>window.__patakha.getState().physics.status==='ready' || window.__patakha.getState().mode==='result',{},{timeout:20000});
  const weak=await page.evaluate(()=>({progress:window.__patakha.getState().physics.progress,status:window.__patakha.getState().physics.status,shots:window.__patakha.getState().physics.shotsUsed}));
  assert.equal(weak.status,'ready');assert.ok(weak.progress<15);assert.equal(weak.shots,1);

  await page.getByRole('button',{name:'Restart level',exact:true}).click();
  await drag({x:-112,y:28});
  const aim=await page.evaluate(()=>window.__patakha.getState().aim);
  assert.ok(aim.velocity.x>29 && aim.points.length>40);
  await page.screenshot({path:path.join(screenshots,'aim.png')});
  await page.mouse.up();
  await page.getByRole('button',{name:'BOOST ROCKET'}).click();
  assert.equal(await page.evaluate(()=>window.__patakha.physics.projectile.plugin.activated),true);
  await openSettings();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().mode),'pause');
  const settingsFlight=await page.evaluate(()=>({position:{...window.__patakha.physics.projectile.position},shots:window.__patakha.physics.shotsUsed,score:window.__patakha.physics.score}));
  await setSize(5);
  await page.waitForTimeout(180);
  assert.deepEqual(await page.evaluate(()=>({position:{...window.__patakha.physics.projectile.position},shots:window.__patakha.physics.shotsUsed,score:window.__patakha.physics.score})),settingsFlight);
  await setSize(3);
  await page.locator('#ui-scale-slider').press('Escape');
  assert.equal(await page.evaluate(()=>window.__patakha.getState().mode),'play');
  await page.getByRole('button',{name:'Pause game',exact:true}).click();
  const pausedX=await page.evaluate(()=>window.__patakha.physics.projectile.position.x);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__patakha.physics.projectile.position.x),pausedX);
  await page.getByRole('button',{name:'BACK TO THE DHAMAKA'}).click();
  await page.getByRole('button',{name:'Restart level',exact:true}).click();

  // Physics tests prove legal winning solutions; here deliberate misses check
  // the browser's ammo, loss/result and retry transitions without long waits.
  await page.evaluate(()=>{const game=window.__patakha.physics;for(let shot=0;shot<game.level.shots;shot++){game.launch('rocket',{x:2,y:-2});for(let i=0;i<750&&['flight','settling'].includes(game.status);i++)game.update(1000/60);}});
  await page.waitForFunction(()=>window.__patakha.getState().mode==='result');
  assert.equal(await page.evaluate(()=>window.__patakha.getState().physics.status),'lost');
  await page.getByRole('button',{name:'TRY THAT SHOT AGAIN'}).click();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().physics.shotsUsed),0);

  // Real pointer drags complete the opening puzzle. Fixed steps and the same
  // ability API used by the boost button make ability timing deterministic.
  let pointerShots=0;
  for(const action of LEVEL_SOLUTIONS[1]) {
    if(await page.evaluate(()=>window.__patakha.getState().physics.status==='won'))break;
    await page.waitForFunction(()=>window.__patakha.getState().physics.status==='ready');
    await page.waitForFunction(()=>window.__patakha.renderer.cameraX<1 && window.__patakha.renderer.shake<1);
    await drag({x:-action.vx*WORLD.maxPull/WORLD.maxSpeed,y:-action.vy*WORLD.maxPull/WORLD.maxSpeed});
    const aimed=await page.evaluate(()=>window.__patakha.getState().aim.velocity);
    assert.ok(Math.hypot(aimed.x-action.vx,aimed.y-action.vy)<0.001);
    await page.mouse.up();
    pointerShots++;
    await page.evaluate(x=>{const game=window.__patakha.physics;let activated=false;for(let i=0;i<650&&['flight','settling'].includes(game.status);i++){if(!activated&&game.projectile?.position.x>=x){game.activate();activated=true;}game.update(1000/60);}},action.activateX);
  }
  await page.locator('.result-won').waitFor();
  const win=await page.evaluate(()=>({progress:window.__patakha.getState().physics.progress,shots:window.__patakha.getState().physics.shotsUsed,unlocked:window.__patakha.getState().save.unlocked}));
  assert.ok(win.progress>=90);assert.equal(win.shots,pointerShots);assert.equal(win.unlocked,2);
  if(win.progress>=97) {
    assert.equal(await page.locator('.result-diyas .is-lit').count(),3);
    assert.ok(await page.evaluate(()=>window.__patakha.renderer.celebration>0));
  }
  await page.screenshot({path:path.join(screenshots,'victory.png')});
  await openSettings();
  await page.locator('[data-action="close-settings"]').first().click();
  assert.equal(await page.evaluate(()=>window.__patakha.ui.screenName),'result');
  assert.ok(await page.locator('.result-won').isVisible());
  await page.locator('[data-action="next"]').click();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().level),2);

  // A legal Sutli launch flattens both reinforced towers of level 7. The
  // intact chunks in its rubble pile must still earn full destruction.
  await page.evaluate(()=>window.__patakha.startLevel(7));
  if(await page.locator('[data-action="close-unlock"]').count())await page.locator('[data-action="close-unlock"]').click();
  await page.getByRole('button',{name:'Choose Sutli Bomb',exact:true}).click();
  const collapse=await page.evaluate(()=>{
    const game=window.__patakha.physics;
    if(!game.launch('sutli',{x:26,y:-4}))throw new Error('collapsed skyline shot did not launch');
    for(let i=0;i<650&&['flight','settling'].includes(game.status);i++)game.update(1000/60);
    return {progress:game.progress,status:game.status,remaining:game.getState().remaining,unsupported:game.getUnsupportedBodies().length};
  });
  assert.equal(collapse.status,'won');assert.equal(collapse.progress,100);assert.equal(collapse.unsupported,0);
  await page.locator('.result-won').waitFor();
  assert.equal(await page.locator('.result-diyas .is-lit').count(),3);
  assert.match(await page.locator('.result-stats>div').first().textContent(),/100\s*%/);
  await page.screenshot({path:path.join(screenshots,'full-collapse.png')});

  await page.getByRole('button',{name:'Turn music off',exact:true}).click();
  await page.getByRole('button',{name:'Turn sound effects off',exact:true}).click();
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>window.__patakha.getState().save.music),false);
  assert.equal(await page.evaluate(()=>window.__patakha.getState().save.sound),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,weak,win,collapse,checks:['actual uploaded video playback','live UI sizes 1–5 and button bounds','saved UI size after reload','settings returns to unlock and result','UI resizing preserves paused flight','resizing cancels held aim without firing','start/help/locked levels','pause/resume','real weak drag fails to collapse skyline','long range trajectory','rocket ability','paused flight','retry','real pointer victory','next level and saved unlock','collapsed skyline reads 100% and earns three diyas','audio persistence'],errors}));
} finally {await browser.close();}
