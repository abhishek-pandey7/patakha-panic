import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSave, writeSave, freshSave, awardDiyas, recordResult, normalizeUIScale} from '../src/progress.js';

test('UI size upgrades older saves without changing progress or sound preferences',()=>{
  const legacy = {unlocked:5,best:{4:{score:900,diyas:2,progress:96}},seen:['rocket','sutli'],music:false,sound:true};
  const loaded = loadSave({getItem:()=>JSON.stringify(legacy)});
  assert.deepEqual(loaded,{...legacy,uiScale:3});
});

test('UI size accepts bounded whole-number choices and safely handles corrupt values',()=>{
  for (const value of [undefined,null,true,false,[],{},'', '  ',NaN,Infinity,-Infinity,'wrong']) {
    assert.equal(normalizeUIScale(value),3,`invalid choice ${String(value)}`);
  }
  for (const [value,expected] of [[1,1],[5,5],[0,1],[-20,1],[99,5],[3.7,4],['2',2],[' 4 ',4]]) {
    assert.equal(normalizeUIScale(value),expected);
    assert.equal(loadSave({getItem:()=>JSON.stringify({uiScale:value})}).uiScale,expected);
  }
});

test('UI size persists across reloads and level results',()=>{
  let stored;
  const storage = {setItem:(_key,value)=>{stored=value;},getItem:()=>stored};
  const save = {...freshSave(),uiScale:5};
  recordResult(save,{id:1},{won:true,score:1800,diyas:3,progress:100});
  assert.equal(writeSave(save,storage),true);
  const restored = loadSave(storage);
  assert.equal(restored.uiScale,5);
  assert.equal(restored.unlocked,2);
  assert.equal(restored.best[1].score,1800);
});

test('unavailable or corrupt storage falls back to a playable first level',()=>{
  assert.deepEqual(loadSave({getItem(){throw new Error('private mode');}}),freshSave());
  assert.deepEqual(loadSave({getItem:()=>'{bad'}),freshSave());
  assert.equal(writeSave(freshSave(),{setItem(){throw Error('quota');}}),false);
  assert.equal(loadSave({getItem:()=>JSON.stringify({unlocked:999,seen:['rocket','invalid']})}).unlocked,8);
});
test('90% is mandatory and three diyas require efficient high destruction',()=>{
  const level={par:2};
  assert.equal(awardDiyas({progress:89,shotsUsed:1,remaining:5},level),0);
  assert.equal(awardDiyas({progress:90,shotsUsed:4,remaining:0},level),1);
  assert.equal(awardDiyas({progress:96,shotsUsed:4,remaining:0},level),2);
  assert.equal(awardDiyas({progress:99,shotsUsed:2,remaining:1},level),3);
});
test('only victories unlock levels and replay preserves individual personal bests',()=>{
  const save=freshSave();
  recordResult(save,{id:1},{won:false,score:100,diyas:0,progress:89});
  assert.equal(save.unlocked,1);
  recordResult(save,{id:1},{won:true,score:2000,diyas:3,progress:100});
  assert.equal(save.unlocked,2);
  recordResult(save,{id:1},{won:true,score:1000,diyas:1,progress:92});
  assert.deepEqual(save.best[1],{score:2000,diyas:3,progress:100});
  recordResult(save,{id:8},{won:true,score:500,diyas:1,progress:92});
  assert.equal(save.unlocked,8);
});
