import test from 'node:test';
import assert from 'node:assert/strict';
import { GamePhysics, predictTrajectory, FIXED_STEP } from '../src/physics.js';

const supportHouse = () => ({
  shots: 3, unlockedTypes: ['rocket', 'sutli', 'chakri', 'ladi'],
  pieces: [
    { x: 884, y: 611, w: 24, h: 78, material: 'wood', weak: true, group: 'house' },
    { x: 1036, y: 611, w: 24, h: 78, material: 'wood', group: 'house' },
    { x: 960, y: 566, w: 196, h: 14, material: 'brick', group: 'house' },
    ...Array.from({ length: 3 }, (_, i) => ({
      x: 892 + i * 68, y: 532, w: 60, h: 54, material: 'brick', group: 'house',
    })),
    { x: 960, y: 496, w: 210, h: 15, material: 'wood', group: 'house' },
  ],
});

function settle(game) {
  for (let i = 0; i < 650 && ['flight', 'settling'].includes(game.status); i++) game.update(FIXED_STEP);
}

test('dotted preview follows the actual Matter.js projectile at a fixed timestep', () => {
  const game = new GamePhysics({ shots: 1, pieces: [], unlockedTypes: ['rocket'] });
  const velocity = { x: 16, y: -9 };
  const preview = predictTrajectory(velocity, 30);
  assert.equal(game.launch('rocket', velocity), true);
  for (const predicted of preview.slice(1)) {
    game.update(FIXED_STEP);
    assert.ok(Math.hypot(game.projectile.position.x - predicted.x, game.projectile.position.y - predicted.y) < 0.001);
  }
  game.destroy();
});

test('an untouched structure cannot silently lose health while waiting for a shot', () => {
  const game = new GamePhysics(supportHouse());
  for (let i = 0; i < 1200; i++) game.update(FIXED_STEP);
  assert.equal(game.progress, 0);
  assert.equal(game.score, 0);
  assert.ok(game.bodies.every(body => body.plugin.health === body.plugin.maxHealth));
  game.destroy();
});

test('a precise support shot collapses a real multi-body house and clears 90 percent', () => {
  const events = [];
  const game = new GamePhysics(supportHouse(), event => events.push(event));
  game.launch('rocket', { x: 23, y: 0 });
  settle(game);
  assert.equal(game.status, 'won');
  assert.ok(game.progress >= 90);
  assert.equal(game.shotsUsed, 1);
  assert.ok(events.some(event => event.type === 'damage' && event.reason === 'collapse'));
  assert.equal(events.filter(event => event.type === 'win').length, 1);
  game.destroy();
});

test('the four cracker abilities have separate observable mechanics', () => {
  const rocket = new GamePhysics(supportHouse());
  rocket.launch('rocket', { x: 16, y: -8 });
  const initialSpeed = rocket.projectile.speed;
  assert.equal(rocket.activate(), true);
  assert.ok(rocket.projectile.speed > initialSpeed * 1.5);
  assert.equal(rocket.activate(), false);
  rocket.destroy();

  const bombEvents = [];
  const bomb = new GamePhysics(supportHouse(), event => bombEvents.push(event));
  bomb.launch('sutli', { x: 16, y: -8 });
  bomb.activate();
  assert.equal(bomb.projectile, null);
  assert.ok(bombEvents.some(event => event.type === 'explosion' && event.radius > 230));
  bomb.destroy();

  const chakriEvents = [];
  const chakri = new GamePhysics(supportHouse(), event => chakriEvents.push(event));
  chakri.launch('chakri', { x: 23, y: 0 });
  settle(chakri);
  assert.ok(chakriEvents.filter(event => event.type === 'explosion' && event.cracker === 'chakri').length > 6);
  chakri.destroy();

  const ladiEvents = [];
  const ladi = new GamePhysics(supportHouse(), event => ladiEvents.push(event));
  ladi.launch('ladi', { x: 23, y: 0 });
  settle(ladi);
  const pops = ladiEvents.filter(event => event.type === 'explosion' && event.cracker === 'ladi');
  assert.equal(pops.length, 8);
  assert.ok(pops.at(-1).x > pops[0].x + 150);
  assert.ok(pops.at(-1).time > pops[0].time + 900);
  ladi.destroy();
});

test('shots always finish, inventory cannot be overspent, and zero damage yields a retry', () => {
  const game = new GamePhysics({ ...supportHouse(), shots: 1 });
  assert.equal(game.launch('rocket', { x: -10, y: 0 }), false);
  assert.equal(game.launch('rocket', { x: NaN, y: 0 }), false);
  assert.equal(game.launch('rocket', { x: 2, y: -10 }), true);
  assert.equal(game.launch('rocket', { x: 23, y: 0 }), false);
  settle(game);
  assert.equal(game.status, 'lost');
  assert.equal(game.getState().remaining, 0);
  assert.equal(game.launch('rocket', { x: 23, y: 0 }), false);
  game.destroy();
});
