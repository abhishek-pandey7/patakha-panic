import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;

export const LAUNCHER = Object.freeze({ x: 235, y: 450 });
export const GROUND_Y = 650;
export const FIXED_STEP = 1000 / 60;
const AIR = 0.002;
const GRAVITY = 1;
const GRAVITY_SCALE = 0.001;
const MATERIALS = {
  wood: { health: 46, density: 0.0013, friction: 0.68, points: 110 },
  brick: { health: 100, density: 0.0020, friction: 0.64, points: 160 },
  concrete: { health: 185, density: 0.0030, friction: 0.70, points: 240 },
  metal: { health: 130, density: 0.0026, friction: 0.58, points: 200 },
};

/** Exact free-flight positions for the launcher's Matter.js fixed timestep.
 * Velocity is expressed in pixels per 60 Hz frame, as in Body.setVelocity.
 */
export function predictTrajectory(velocity, steps = 40) {
  let x = LAUNCHER.x;
  let y = LAUNCHER.y;
  let vx = velocity.x;
  let vy = velocity.y;
  const points = [{ x, y }];
  for (let i = 0; i < steps; i++) {
    vx *= 1 - AIR;
    vy = vy * (1 - AIR) + GRAVITY * GRAVITY_SCALE * FIXED_STEP * FIXED_STEP;
    x += vx;
    y += vy;
    points.push({ x, y });
    if (y > GROUND_Y || x > 1510 || x < -100) break;
  }
  return points;
}

export class GamePhysics {
  constructor(level, onEvent = () => {}) {
    this.onEvent = onEvent;
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = GRAVITY;
    this.engine.gravity.scale = GRAVITY_SCALE;
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 8;
    this.engine.constraintIterations = 3;
    this._collisionHandler = event => this._onCollision(event);
    Events.on(this.engine, 'collisionStart', this._collisionHandler);
    if (level) this.load(level);
  }

  load(level) {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.level = level;
    this.bodies = [];
    this.projectile = null;
    this.status = 'ready';
    this.score = 0;
    this.shotsUsed = 0;
    this.combo = 0;
    this.lastComboGroups = 0;
    this.progress = 0;
    this.accumulator = 0;
    this.time = 0;
    this.shotTime = 0;
    this.calmTime = 0;
    this.lastDestructionTime = -10000;
    this.streak = 0;
    this.destroyedGroups = new Set();
    this.scheduledPops = [];
    this.initializing = true;
    const ground = Bodies.rectangle(720, GROUND_Y + 35, 2100, 70, {
      isStatic: true, friction: 0.85, label: 'ground',
    });
    const rooftop = Bodies.rectangle(169, 576, 196, 164, {
      isStatic: true, friction: 0.8, label: 'launcher-rooftop',
    });
    Composite.add(this.engine.world, [ground, rooftop]);
    for (const piece of level.pieces) {
      const material = MATERIALS[piece.material] || MATERIALS.brick;
      const maxHealth = piece.health || material.health * (piece.weak ? 0.48 : 1);
      const body = Bodies.rectangle(piece.x, piece.y, piece.w, piece.h, {
        density: material.density,
        friction: material.friction,
        frictionStatic: 0.95,
        frictionAir: 0.005,
        restitution: 0.035,
        sleepThreshold: 50,
        chamfer: { radius: Math.min(2, piece.w / 6, piece.h / 6) },
        label: `target-${piece.material}`,
      });
      body.plugin = {
        piece, health: maxHealth, maxHealth, destroyed: false,
        original: { x: piece.x, y: piece.y, angle: 0 },
        weight: Math.sqrt(piece.w * piece.h), points: material.points,
        lastHit: -10000, collapsed: false,
      };
      this.bodies.push(body);
      Composite.add(this.engine.world, body);
    }
    // Stable contacts are established before enabling damage. The idle village
    // cannot score points or silently lose health under its own initial weight.
    for (let i = 0; i < 100; i++) Engine.update(this.engine, FIXED_STEP);
    for (const body of this.bodies) {
      body.plugin.original = { ...body.position, angle: body.angle };
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
      Sleeping.set(body, true);
    }
    this.totalWeight = this.bodies.reduce((sum, body) => sum + body.plugin.weight, 0);
    this.initializing = false;
    return this.getState();
  }

  launch(type, velocity) {
    if (this.status !== 'ready' || this.shotsUsed >= this.level.shots) return false;
    if (!['rocket', 'sutli', 'chakri', 'ladi'].includes(type)) return false;
    if (this.level.unlockedTypes && !this.level.unlockedTypes.includes(type)) return false;
    if (!Number.isFinite(velocity?.x) || !Number.isFinite(velocity?.y)) return false;
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed < 1 || velocity.x <= 0) return false;
    const scale = Math.min(1, 24 / speed);
    const v = { x: velocity.x * scale, y: velocity.y * scale };
    const radius = type === 'sutli' ? 19 : type === 'chakri' ? 20 : 15;
    this.projectile = Bodies.circle(LAUNCHER.x, LAUNCHER.y, radius, {
      density: type === 'sutli' ? 0.016 : 0.010,
      frictionAir: AIR, friction: type === 'chakri' ? 0.07 : 0.3,
      restitution: type === 'chakri' ? 0.22 : 0.05,
      label: `firecracker-${type}`, sleepThreshold: Infinity,
    });
    this.projectile.plugin = {
      type, radius, activated: false, impacted: false, born: this.time,
      rollingUntil: 0, pulseAt: 0, detonateAt: 0, hits: 0,
    };
    Body.setVelocity(this.projectile, v);
    Body.setAngle(this.projectile, Math.atan2(v.y, v.x));
    Composite.add(this.engine.world, this.projectile);
    this.shotsUsed++;
    this.status = 'flight';
    this.shotTime = 0;
    this.calmTime = 0;
    this.destroyedGroups.clear();
    this.streak = 0;
    this.combo = 0;
    this.lastComboGroups = 0;
    this._emit({ type: 'launch', cracker: type, x: LAUNCHER.x, y: LAUNCHER.y });
    return true;
  }

  activate() {
    const projectile = this.projectile;
    if (!projectile || this.status !== 'flight' || projectile.plugin.activated) return false;
    projectile.plugin.activated = true;
    const type = projectile.plugin.type;
    this._emit({ type: 'ability', cracker: type, x: projectile.position.x, y: projectile.position.y,
      message: { rocket: 'Rocket boost!', sutli: 'Dhamaka!', chakri: 'Let it spin!', ladi: 'Light the ladi!' }[type] });
    if (type === 'rocket') {
      const v = projectile.velocity;
      const direction = Math.atan2(v.y, v.x);
      const speed = Math.max(31, Math.hypot(v.x, v.y) * 1.65);
      Body.setVelocity(projectile, { x: Math.cos(direction) * speed, y: Math.sin(direction) * speed });
    } else if (type === 'sutli') {
      this._explode(projectile.position.x, projectile.position.y, 242, 285, type);
      this._removeProjectile();
    } else if (type === 'chakri') {
      Body.setVelocity(projectile, { x: Math.max(12, projectile.velocity.x * 1.2), y: Math.max(3, projectile.velocity.y) });
      Body.setAngularVelocity(projectile, 0.6);
    } else if (type === 'ladi') {
      this._startLadi(projectile.position.x, projectile.position.y);
    }
    return true;
  }

  update(dtMs) {
    if (!this.level || this.status === 'ready' || this.status === 'won' || this.status === 'lost') return;
    this.accumulator += Math.min(100, Math.max(0, dtMs || 0));
    let safety = 0;
    while (this.accumulator >= FIXED_STEP && safety++ < 7) {
      this.accumulator -= FIXED_STEP;
      this._step();
    }
  }

  _step() {
    this.time += FIXED_STEP;
    this.shotTime += FIXED_STEP;
    for (const body of this.bodies) body.plugin.priorVelocity = { ...body.velocity };
    if (this.projectile) this.projectile.plugin.priorVelocity = { ...this.projectile.velocity };
    Engine.update(this.engine, FIXED_STEP);
    this._updateProjectile();
    for (let i = this.scheduledPops.length - 1; i >= 0; i--) {
      const pop = this.scheduledPops[i];
      if (this.time >= pop.at) {
        this.scheduledPops.splice(i, 1);
        this._explode(pop.x, pop.y, pop.radius, pop.strength, 'ladi');
      }
    }
    for (const body of this.bodies) {
      const p = body.plugin;
      if (p.destroyed) continue;
      const displacement = Math.hypot(body.position.x - p.original.x, body.position.y - p.original.y);
      const tilt = Math.abs(body.angle - p.original.angle);
      const fall = body.position.y - p.original.y;
      // Count unusable, toppled building pieces as destroyed structure while
      // retaining their physical rubble for secondary impacts and dominoes.
      if (displacement > Math.max(35, Math.min(p.piece.w, p.piece.h) * 0.7) || tilt > 0.34 || fall > 28) {
        this._damage(body, p.maxHealth, 'collapse');
      }
    }
    this._updateProgress();
    if (this.projectile && this.shotTime > 5600) {
      const { x, y } = this.projectile.position;
      if (this.projectile.plugin.type === 'sutli') this._explode(x, y, 242, 285, 'sutli');
      else if (this.projectile.plugin.type === 'ladi') this._startLadi(x, y);
      this._removeProjectile();
    }
    if (!this.projectile && !this.scheduledPops.length) {
      this.status = 'settling';
      let motion = 0;
      for (const body of this.bodies) motion += Math.hypot(body.velocity.x, body.velocity.y) + Math.abs(body.angularVelocity) * 10;
      const meanMotion = motion / Math.max(1, this.bodies.length);
      if (meanMotion < 0.42) this.calmTime += FIXED_STEP;
      else this.calmTime = 0;
      if ((this.calmTime >= 620 && this.shotTime > 1200) || this.shotTime >= 8600) this._finishShot();
    }
    if (this.shotTime >= 10000) {
      this.scheduledPops.length = 0;
      this._removeProjectile();
      this._finishShot();
    }
  }

  _updateProjectile() {
    const projectile = this.projectile;
    if (!projectile) return;
    const p = projectile.plugin;
    const { x, y } = projectile.position;
    if (p.type === 'rocket') {
      Body.setAngle(projectile, Math.atan2(projectile.velocity.y, projectile.velocity.x));
      if (p.detonateAt && this.time >= p.detonateAt) {
        this._explode(x, y, 162, 210, 'rocket');
        this._removeProjectile();
        return;
      }
    } else if (p.type === 'chakri' && p.rollingUntil) {
      Body.setAngularVelocity(projectile, 0.55);
      if (projectile.velocity.x < 10) Body.setVelocity(projectile, { x: 10, y: projectile.velocity.y });
      if (this.time >= p.pulseAt) {
        p.pulseAt = this.time + 165;
        this._explode(x, y, 112, 62, 'chakri', 0.45);
      }
      if (this.time >= p.rollingUntil) {
        this._explode(x, y, 125, 85, 'chakri');
        this._removeProjectile();
        return;
      }
    }
    if (x > 1550 || x < -150 || y > 850) this._removeProjectile();
  }

  _onCollision({ pairs }) {
    if (this.initializing || this.status === 'ready' || this.status === 'won' || this.status === 'lost') return;
    for (const pair of pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const projectile = this.projectile;
      if (projectile && (a === projectile || b === projectile)) {
        const other = a === projectile ? b : a;
        const p = projectile.plugin;
        if (!p.impacted) {
          p.impacted = true;
          const { x, y } = projectile.position;
          if (p.type === 'sutli') {
            this._explode(x, y, 242, 285, 'sutli');
            this._removeProjectile();
          } else if (p.type === 'rocket' && p.activated) {
            if (other.plugin.piece) this._damage(other, 290, 'rocket');
            p.detonateAt = this.time + 125;
            const v = p.priorVelocity || projectile.velocity;
            Body.setVelocity(projectile, { x: Math.max(19, v.x * 0.8), y: v.y * 0.7 });
            projectile.isSensor = true;
            this._emit({ type: 'explosion', cracker: 'rocket', x, y, radius: 54, power: 0.6 });
          } else if (p.type === 'rocket') {
            if (other.plugin.piece) this._damage(other, 150, 'rocket');
            this._explode(x, y, 112, 155, 'rocket');
            this._removeProjectile();
          } else if (p.type === 'chakri') {
            p.rollingUntil = this.time + 2300;
            p.pulseAt = this.time;
            if (other.plugin.piece) this._damage(other, 115, 'chakri');
            Body.setVelocity(projectile, { x: 12, y: -0.5 });
            Body.setAngularVelocity(projectile, 0.55);
            this._emit({ type: 'ability', cracker: 'chakri', x, y, message: 'Spin to win!' });
          } else if (p.type === 'ladi') this._startLadi(x, y);
        } else if (p.type === 'chakri' && other.plugin.piece) {
          this._damage(other, 55, 'chakri');
        }
      }
      const va = a.plugin.priorVelocity || a.velocity;
      const vb = b.plugin.priorVelocity || b.velocity;
      const normal = pair.collision.normal;
      const relativeSpeed = Math.abs((va.x - vb.x) * normal.x + (va.y - vb.y) * normal.y);
      if (relativeSpeed < 2.35) continue;
      for (const [body, other] of [[a, b], [b, a]]) {
        if (!body.plugin.piece || body.plugin.destroyed) continue;
        if (this.time - body.plugin.lastHit < 100) continue;
        body.plugin.lastHit = this.time;
        const massRatio = other.isStatic ? 1 : Math.min(2.4, Math.max(0.35, other.mass / body.mass));
        const damage = (relativeSpeed - 1.6) * 9 * massRatio;
        this._damage(body, damage, 'collision');
      }
    }
  }

  _startLadi(x, y) {
    // Consecutive charges travel along the fuse instead of producing one large
    // blast. Shops close together can knock into each other between the pops.
    const velocityX = this.projectile?.velocity.x || 10;
    const velocityY = this.projectile?.velocity.y || 0;
    const airborne = y < GROUND_Y - 85;
    for (let i = 0; i < 8; i++) {
      this.scheduledPops.push({
        at: this.time + i * 155,
        x: x + i * Math.max(26, Math.min(45, velocityX * 2.5)),
        y: Math.min(GROUND_Y - 15, y + (airborne ? i * Math.max(5, velocityY * 2) + i * i * 2 : 0)),
        radius: 118, strength: 100,
      });
    }
    this._removeProjectile();
  }

  _explode(x, y, radius, strength, cracker, impulseScale = 1) {
    this._emit({ type: 'explosion', cracker, x, y, radius, power: impulseScale });
    for (const body of this.bodies) {
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const distance = Math.hypot(dx, dy);
      // Account for a piece's closest edge, so a large slab can be hit near its end.
      const edgeDistance = Math.max(0, distance - Math.min(body.plugin.piece.w, body.plugin.piece.h) * 0.33);
      if (edgeDistance > radius) continue;
      const falloff = 1 - edgeDistance / radius;
      Sleeping.set(body, false);
      this._damage(body, strength * Math.pow(falloff, 0.8), cracker);
      const directionX = distance > 1 ? dx / distance : 0.2;
      const directionY = distance > 1 ? dy / distance : -1;
      const materialMass = Math.max(0.85, Math.sqrt(body.mass / 5));
      const force = (3 + 13 * falloff) * impulseScale / materialMass;
      Body.setVelocity(body, {
        x: body.velocity.x + directionX * force,
        y: body.velocity.y + (directionY - 0.24) * force,
      });
      Body.setAngularVelocity(body, body.angularVelocity + directionX * falloff * 0.09 * impulseScale);
    }
  }

  _damage(body, amount, reason) {
    const p = body.plugin;
    if (!p?.piece || p.destroyed || amount <= 0) return;
    const actual = Math.min(p.health, amount);
    p.health = Math.max(0, p.health - amount);
    this.score += Math.round(actual * 1.2);
    this._emit({ type: 'damage', x: body.position.x, y: body.position.y,
      material: p.piece.material, amount: actual, destroyed: p.health <= 0, reason });
    if (p.health > 0) return;
    p.destroyed = true;
    p.collapsed = reason === 'collapse';
    p.destroyedAt = this.time;
    Sleeping.set(body, false);
    // Rubble remains a normal body, allowing it to transfer momentum to the
    // neighboring structure. Its ghost health can never award points twice.
    this.score += p.points;
    if (this.time - this.lastDestructionTime < 1100) this.streak++;
    else this.streak = 1;
    this.lastDestructionTime = this.time;
    this.destroyedGroups.add(p.piece.group ?? 'building');
    this.combo = Math.max(this.combo, this.destroyedGroups.size, Math.floor(this.streak / 3));
    if (this.streak === 3 || this.streak % 5 === 0 || this.destroyedGroups.size > this.lastComboGroups) {
      this.score += this.combo * 120;
      this.lastComboGroups = this.destroyedGroups.size;
      this._emit({ type: 'combo', x: body.position.x, y: body.position.y, combo: this.combo,
        slowMotion: this.streak >= 5,
        message: this.combo >= 3 ? `Dhamaka x${this.combo}!` : this.streak >= 5 ? 'Full paisa vasool!' : 'Kya shot hai!' });
    }
  }

  _updateProgress() {
    const damagedWeight = this.bodies.reduce((sum, body) => {
      const p = body.plugin;
      return sum + p.weight * (1 - p.health / p.maxHealth);
    }, 0);
    this.progress = Math.min(100, 100 * damagedWeight / Math.max(1, this.totalWeight));
  }

  _removeProjectile() {
    if (!this.projectile) return;
    Composite.remove(this.engine.world, this.projectile);
    this.projectile = null;
    this.status = 'settling';
    this.calmTime = 0;
  }

  _finishShot() {
    if (this.status === 'won' || this.status === 'lost' || this.status === 'ready') return;
    this._updateProgress();
    for (const body of this.bodies) {
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
      Sleeping.set(body, true);
    }
    if (this.progress >= 90 - 0.0001) {
      this.status = 'won';
      this.score += Math.max(0, this.level.shots - this.shotsUsed) * 1000;
      this._emit({ type: 'win', score: this.score, progress: this.progress, remaining: this.level.shots - this.shotsUsed });
    } else if (this.shotsUsed >= this.level.shots) {
      this.status = 'lost';
      this._emit({ type: 'lose', score: this.score, progress: this.progress, remaining: 0 });
    } else this.status = 'ready';
  }

  _emit(event) {
    this.onEvent({ ...event, time: this.time });
  }

  getState() {
    return {
      bodies: this.bodies || [], projectile: this.projectile,
      progress: this.progress || 0, score: this.score || 0,
      shotsUsed: this.shotsUsed || 0,
      remaining: Math.max(0, (this.level?.shots || 0) - (this.shotsUsed || 0)),
      status: this.status || 'ready', combo: this.combo || 0,
    };
  }

  destroy() {
    Events.off(this.engine, 'collisionStart', this._collisionHandler);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.projectile = null;
    this.bodies = [];
  }
}
