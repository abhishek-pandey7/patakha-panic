import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {WORLD} from '../src/config.js';
import {LEVEL_SOLUTIONS} from '../src/levels.js';

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
  await page.getByRole('button',{name:'How to play',exact:true}).click();
  await page.getByRole('button',{name:'GOT IT'}).click();
  await page.getByRole('button',{name:'Choose a level',exact:true}).click();
  assert.equal(await page.locator('.level-card').count(),8);
  assert.equal(await page.locator('.level-card:disabled').count(),7);
  await page.locator('[data-level="1"]').click();
  await page.getByRole('button',{name:'LET’S LIGHT IT UP'}).click();
  await page.getByRole('button',{name:'Pause game',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().mode),'pause');
  await page.getByRole('button',{name:'BACK TO THE DHAMAKA'}).click();
  await page.getByRole('button',{name:'How to play',exact:true}).click();
  await page.getByRole('button',{name:'GOT IT'}).click();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().mode),'play');

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
  await page.screenshot({path:path.join(screenshots,'victory.png')});
  await page.locator('[data-action="next"]').click();
  assert.equal(await page.evaluate(()=>window.__patakha.getState().level),2);

  await page.getByRole('button',{name:'Turn music off',exact:true}).click();
  await page.getByRole('button',{name:'Turn sound effects off',exact:true}).click();
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>window.__patakha.getState().save.music),false);
  assert.equal(await page.evaluate(()=>window.__patakha.getState().save.sound),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,weak,win,checks:['actual uploaded video playback','start/help/locked levels','pause/resume','real weak drag fails to collapse skyline','long range trajectory','rocket ability','paused flight','retry','real pointer victory','next level and saved unlock','audio persistence'],errors}));
} finally {await browser.close();}
