import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import {GamePhysics,predictTrajectory,FIXED_STEP,MATERIALS,getDamageMultiplier} from '../src/physics.js';
import {LEVELS,LEVEL_SOLUTIONS} from '../src/levels.js';
import {WORLD} from '../src/config.js';

function playShot(game,action) {
  assert.equal(game.launch(action.type,{x:action.vx,y:action.vy}),true);
  let activated=false;
  for(let i=0;i<650&&['flight','settling'].includes(game.status);i++) {
    if(!activated&&action.activateX&&game.projectile?.position.x>=action.activateX){game.activate();activated=true;}
    game.update(FIXED_STEP);
  }
  assert.ok(!['flight','settling'].includes(game.status),'every shot has a bounded settling phase');
  assert.equal(game.getUnsupportedBodies().length,0,'a finished shot cannot leave unsupported sleeping islands');
}
const fixture=material=>({shots:4,unlockedTypes:['rocket','sutli','chakri','ladi'],pieces:[{x:1410,y:730,w:100,h:100,kind:'wall',material,group:0}]});

test('trajectory preview exactly matches actual Matter.js flight over the longer world',()=>{
  const g=new GamePhysics({shots:1,pieces:[],unlockedTypes:['rocket']});
  const v={x:28,y:-10};const points=predictTrajectory(v,45);
  assert.equal(g.launch('rocket',v),true);
  for(const point of points.slice(1)) {g.update(FIXED_STEP);assert.ok(Math.hypot(g.projectile.position.x-point.x,g.projectile.position.y-point.y)<0.001);}
  assert.equal(points[0].x,WORLD.launcher.x);
  g.destroy();
});

test('authored structures begin upright, untouched and far from the launcher',()=>{
  assert.equal(LEVELS.length,8);
  for(const level of LEVELS) {
    const g=new GamePhysics(level);
    for(const b of g.bodies){const p=b.plugin;assert.equal(p.health,p.maxHealth);assert.ok(Math.hypot(b.position.x-p.piece.x,b.position.y-p.piece.y)<25);assert.ok(Math.abs(b.angle)<0.12);assert.ok(p.piece.x-p.piece.w/2>=1250);assert.ok(p.piece.x+p.piece.w/2<=1850);}
    for(let f=0;f<1200;f++)g.update(FIXED_STEP);
    assert.equal(g.progress,0);assert.equal(g.score,0);g.destroy();
  }
});

test('weak launches and their activated abilities cannot topple any authored building',()=>{
  for(const level of LEVELS)for(const type of level.unlockedTypes) {
    const g=new GamePhysics(level);g.launch(type,{x:7,y:-1});
    for(let i=0;i<650&&['flight','settling'].includes(g.status);i++){if(i===10)g.activate();g.update(FIXED_STEP);}
    assert.ok(g.progress<5,`weak ${type} level ${level.id} does negligible damage`);
    assert.ok(g.bodies.every(b=>!b.plugin.destroyed));assert.equal(g.status,'ready');g.destroy();
  }
});

test('gentle rocking and small displacement do not instantly destroy a target',()=>{
  const g=new GamePhysics({...fixture('brick'),pieces:[{x:1410,y:750,w:240,h:60,kind:'wall',material:'brick',group:0}]});
  Matter.Body.setPosition(g.bodies[0],{x:1418,y:750});Matter.Body.setAngle(g.bodies[0],0.38);
  playShot(g,{type:'rocket',vx:5,vy:-8});
  assert.equal(g.bodies[0].plugin.destroyed,false);assert.ok(g.progress<35);g.destroy();
});

test('actual blast damage and impulse depend on energy and material resistance',()=>{
  const weak=new GamePhysics(fixture('wood'));const before={...weak.bodies[0].position};
  weak._explode(1410,730,150,100,'chakri',{energy:0.04});
  assert.equal(weak.bodies[0].plugin.destroyed,false);assert.ok(weak.bodies[0].speed<0.3);assert.ok(weak.bodies[0].plugin.health>weak.bodies[0].plugin.maxHealth*0.8);assert.deepEqual(weak.bodies[0].position,before);weak.destroy();
  const wood=new GamePhysics(fixture('wood'));wood._explode(1410,730,150,100,'chakri',{energy:1});assert.equal(wood.bodies[0].plugin.destroyed,true);wood.destroy();
  const steel=new GamePhysics(fixture('metal'));steel._explode(1410,730,150,100,'chakri',{energy:1});assert.ok(steel.bodies[0].plugin.health>steel.bodies[0].plugin.maxHealth*0.9);steel.destroy();
  assert.ok(getDamageMultiplier('brick','sutli')>getDamageMultiplier('brick','chakri'));
  assert.ok(getDamageMultiplier('metal','rocket',true)>getDamageMultiplier('metal','rocket')*5);
  assert.ok(MATERIALS.concrete.health>MATERIALS.wood.health);
});

test('the four firecrackers expose four different mechanics',()=>{
  const rocket=new GamePhysics(LEVELS[0]);rocket.launch('rocket',{x:28,y:-8});const speed=rocket.projectile.speed;assert.equal(rocket.activate(),true);assert.ok(rocket.projectile.speed>speed*1.5);assert.equal(rocket.activate(),false);rocket.destroy();
  const explosions=[];const bomb=new GamePhysics(LEVELS[2],e=>explosions.push(e));bomb.launch('sutli',{x:32,y:0});bomb.activate();assert.equal(bomb.projectile,null);assert.ok(explosions.some(e=>e.type==='explosion'&&e.radius>=200));bomb.destroy();
  const spins=[];const chakri=new GamePhysics(LEVELS[4],e=>spins.push(e));playShot(chakri,{type:'chakri',vx:32,vy:0});assert.ok(spins.filter(e=>e.type==='explosion'&&e.cracker==='chakri').length>6);chakri.destroy();
  const events=[];const ladi=new GamePhysics(LEVELS[5],e=>events.push(e));playShot(ladi,{type:'ladi',vx:28,vy:-6});const pops=events.filter(e=>e.type==='explosion'&&e.cracker==='ladi');assert.equal(pops.length,7);assert.ok(pops.at(-1).x>pops[0].x+100);assert.ok(pops.at(-1).time>=pops[0].time+900);ladi.destroy();
});

test('obstacles stay physical and boosted rockets cannot ghost through them',()=>{
  const level={...fixture('wood'),obstacles:[{x:400,y:520,w:40,h:260,kind:'wall',material:'concrete'}]};
  const g=new GamePhysics(level);g.launch('rocket',{x:32,y:0});g.activate();
  let farthest=0;for(let i=0;i<650&&['flight','settling'].includes(g.status);i++){if(g.projectile)farthest=Math.max(farthest,g.projectile.position.x);g.update(FIXED_STEP);}
  assert.ok(farthest<450);assert.ok(g.obstacles.every(b=>b.isStatic&&!b.plugin.destroyed));assert.equal(g.progress,0);g.destroy();
});

test('misses consume ammunition, end in a retry, and inventory cannot be overspent',()=>{
  const g=new GamePhysics({...LEVELS[0],shots:2});
  assert.equal(g.launch('rocket',{x:-4,y:0}),false);assert.equal(g.launch('rocket',{x:NaN,y:0}),false);
  playShot(g,{type:'rocket',vx:5,vy:-10});assert.equal(g.status,'ready');
  playShot(g,{type:'rocket',vx:5,vy:-10});assert.equal(g.status,'lost');assert.equal(g.progress,0);assert.equal(g.getState().remaining,0);assert.equal(g.launch('rocket',{x:32,y:0}),false);g.destroy();
});

test('a precise strong support shot produces a natural collapse and clear',()=>{
  const g=new GamePhysics(LEVELS[0]);playShot(g,{type:'rocket',vx:32,vy:-3,activateX:1120});assert.equal(g.status,'won');assert.ok(g.progress>=90);assert.equal(g.getUnsupportedBodies().length,0);g.destroy();
});

test('fracturing sleeping load-bearing posts wakes the supported roof under gravity',()=>{
  const g=new GamePhysics(LEVELS[0]);const roof=g.bodies.find(b=>b.plugin.piece.kind==='roof');const originalY=roof.position.y;
  assert.equal(roof.isSleeping,true);g.launch('rocket',{x:5,y:-10});
  for(const b of g.bodies.filter(b=>b.plugin.piece.kind==='support'))g._damage(b,b.plugin.health,'support-fracture');
  assert.equal(roof.isSleeping,false);
  for(let i=0;i<850&&['flight','settling'].includes(g.status);i++)g.update(FIXED_STEP);
  assert.ok(roof.position.y>originalY+40,'the intact roof must physically fall after its supports break');
  assert.equal(g.getUnsupportedBodies().length,0);g.destroy();
});

test('reported level-eight rocket shot cannot leave a sleeping roof and tank hanging in the air',()=>{
  const g=new GamePhysics(LEVELS[7]);const top=g.bodies.filter(b=>b.plugin.piece.group===2&&['roof','tank'].includes(b.plugin.piece.kind));const original=top.map(b=>b.position.y);
  playShot(g,{type:'rocket',vx:32,vy:-3,activateX:1120});
  assert.equal(g.getUnsupportedBodies().length,0);
  top.forEach((b,i)=>assert.ok(b.position.y>original[i]+25,'unsupported upper pieces must physically fall, retaining true contacts'));
  assert.ok(g.bodies.every(b=>!b.isSleeping||b.plugin.supported));
  for(let i=0;i<180;i++)g.update(FIXED_STEP);
  assert.equal(g.getUnsupportedBodies().length,0);g.destroy();
});

test('checked-in level solutions clear each authored puzzle within its ammunition budget',()=>{
  assert.deepEqual(Object.keys(LEVEL_SOLUTIONS).map(Number).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
  for(const [id,actions] of Object.entries(LEVEL_SOLUTIONS)){
    const level=LEVELS.find(l=>l.id===Number(id));const g=new GamePhysics(level);
    assert.ok(actions.length<=level.shots);
    for(const action of actions){assert.ok(Math.hypot(action.vx,action.vy)<=WORLD.maxSpeed+1e-9);assert.ok(level.unlockedTypes.includes(action.type));if(g.status==='won')break;playShot(g,action);}
    assert.equal(g.status,'won',`level ${id} has a reproducible legal solution`);assert.ok(g.progress>=90);g.destroy();
  }
});

test('fully collapsed street rubble counts as 100% even when tough chunks retain material health',()=>{
  const g=new GamePhysics(LEVELS[7]);
  const originalAreas=new Map(g.bodies.map(b=>[b,b.area]));
  // This is the reported pile scenario, using a legal player launch. The
  // building already physically collapses on this shot; further shots would
  // only grind intact concrete and steel rubble into smaller fragments.
  playShot(g,{type:'chakri',vx:32,vy:-6});
  assert.equal(g.status,'won');assert.equal(g.progress,100);
  assert.ok(g.bodies.every(b=>b.plugin.destroyed));
  for(const kind of ['roof','tank','wall','slab','support'])assert.ok(g.bodies.some(b=>b.plugin.originalPiece.kind===kind&&b.plugin.destroyed));
  const ruins=g.bodies.filter(b=>b.plugin.structuralDestroyed);
  assert.ok(ruins.length>=8);
  assert.ok(ruins.some(b=>b.plugin.piece.material==='concrete'&&b.plugin.health>100));
  assert.ok(ruins.some(b=>b.plugin.piece.material==='metal'&&b.plugin.health>100));
  for(const b of ruins){assert.equal(b.plugin.materialDestroyed,false);assert.equal(b.area,originalAreas.get(b),'scoring must not shrink a surviving rubble chunk');}
  const score=g.score;const health=ruins.map(b=>b.plugin.health);
  g._countSettledStructuralRuin();g._updateProgress();
  assert.equal(g.score,score,'a structural ruin can award points only once');assert.equal(g.progress,100);
  assert.deepEqual(ruins.map(b=>b.plugin.health),health,'structural scoring preserves material HP');
  assert.equal(g.getUnsupportedBodies().length,0);g.destroy();
});

test('a tilted tank on a surviving high roof does not count as street rubble',()=>{
  const g=new GamePhysics(LEVELS[7]);
  for(let i=0;i<3;i++)playShot(g,{type:'chakri',vx:32,vy:0});
  const tank=g.bodies.find(b=>b.plugin.originalPiece.group===2&&b.plugin.originalPiece.kind==='tank');
  assert.ok(Math.abs(tank.angle-tank.plugin.original.angle)>1);
  assert.ok(tank.position.y<500&&tank.position.y-tank.plugin.original.y<15);
  assert.equal(tank.plugin.structuralDestroyed,false);assert.equal(tank.plugin.destroyed,false);
  assert.ok(g.progress<40);assert.equal(g.status,'ready');g.destroy();
});

test('standing late structures retain their score while genuine full collapses may clear in one shot',()=>{
  let standingCases=0;
  for(const level of LEVELS.slice(4))for(const type of level.unlockedTypes)for(const vy of[-6,-3,0,2]) {
    const g=new GamePhysics(level);playShot(g,{type,vx:32,vy,...(type==='rocket'?{activateX:1120}:{})});
    const standing=g.bodies.filter(b=>!b.plugin.destroyed&&b.position.y-b.plugin.original.y<35&&Math.abs(b.angle-b.plugin.original.angle)<0.35);
    const standingWeight=standing.reduce((sum,b)=>sum+b.plugin.weight*b.plugin.health/b.plugin.maxHealth,0);
    if(standingWeight>=g.totalWeight*0.12){
      standingCases++;
      assert.ok(g.progress<90,`level ${level.id} ${type} still has an intact structure`);
      assert.notEqual(g.status,'won');
    }
    for(const b of standing)assert.equal(b.plugin.structuralDestroyed,false);
    g.destroy();
  }
  assert.ok(standingCases>=20,'the suite actually exercises many standing late structures');
});
