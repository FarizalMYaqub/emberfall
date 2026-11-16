// Enemies: the roster's factory, steering AI and the boss.
// Each enemy is a plain object; update() moves it and may fire enemy bullets.

import { ARENA, ENEMIES, BOSS } from './config.js';
import { clamp, pickWeighted, range } from './random.js';

let nextId = 1;

export function makeEnemy(kind, x, y, wave, rng) {
  const def = ENEMIES[kind];
  const hpScale = 1 + WAVES_HP(wave);
  const enemy = {
    id: nextId += 1,
    kind,
    name: def.name,
    x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed * (1 + (wave - 1) * 0.022) * range(rng, 0.92, 1.08),
    damage: def.damage,
    score: def.score,
    color: def.color,
    core: def.core,
    emberDrop: def.emberDrop,
    fireTimer: range(rng, 0.8, 2.0),
    dartTimer: range(rng, 1.2, 2.6),
    darting: 0,
    angle: 0,
    wobble: rng() * Math.PI * 2,
    flash: 0,
    spawnAge: 0,
  };
  return enemy;
}

function WAVES_HP(wave) {
  return 0.16 * (wave - 1);
}

export function makeBoss(x, y, wave) {
  const hpScale = 1 + 0.35 * (wave - 5);
  return {
    id: nextId += 1,
    kind: 'boss',
    name: BOSS.name,
    x, y,
    vx: 0, vy: 0,
    radius: BOSS.radius,
    hp: BOSS.hp * hpScale,
    maxHp: BOSS.hp * hpScale,
    speed: BOSS.speed,
    damage: BOSS.damage,
    score: BOSS.score,
    color: BOSS.color,
    core: BOSS.core,
    emberDrop: 12,
    fireTimer: 2.0,
    summonTimer: 4.0,
    chargeTimer: 6.0,
    charging: 0,
    chargeAngle: 0,
    angle: 0,
    wobble: 0,
    flash: 0,
    spawnAge: 0,
  };
}

/** Pick a spawn point on a random arena edge, away from the player. */
export function edgeSpawn(rng, player) {
  for (let tries = 0; tries < 8; tries += 1) {
    const edge = Math.floor(rng() * 4);
    let x;
    let y;
    if (edge === 0) { x = range(rng, 40, ARENA.width - 40); y = 36; }
    else if (edge === 1) { x = range(rng, 40, ARENA.width - 40); y = ARENA.height - 36; }
    else if (edge === 2) { x = 36; y = range(rng, 40, ARENA.height - 40); }
    else { x = ARENA.width - 36; y = range(rng, 40, ARENA.height - 40); }
    const dx = x - player.x;
    const dy = y - player.y;
    if (dx * dx + dy * dy > 300 * 300) return { x, y };
  }
  return { x: ARENA.width / 2, y: 40 };
}

/** The spawn table for a wave: every unlocked kind, weighted. */
export function spawnTable(wave) {
  return Object.entries(ENEMIES)
    .filter(([, def]) => def.unlock <= wave)
    .map(([kind, def]) => ({ kind, weight: def.weight }));
}

export function pickKind(rng, wave) {
  return pickWeighted(rng, spawnTable(wave)).kind;
}

/**
 * Steer one enemy for dt seconds. Returns 'shoot' when a Weaver should fire,
 * 'burst' when the boss should fire a radial burst, 'summon' when the boss
 * should call motes. Enemy bullets are spawned by the world, not here.
 */
export function updateEnemy(enemy, dt, player, rng) {
  enemy.spawnAge += dt;
  if (enemy.flash > 0) enemy.flash -= dt;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  let event = null;

  if (enemy.kind === 'mote') {
    enemy.wobble += dt * 2.2;
    const wob = Math.sin(enemy.wobble) * 0.35;
    const px = -uy * wob;
    const py = ux * wob;
    enemy.vx = (ux + px) * enemy.speed;
    enemy.vy = (uy + py) * enemy.speed;
  } else if (enemy.kind === 'stinger') {
    enemy.dartTimer -= dt;
    if (enemy.darting > 0) {
      enemy.darting -= dt;
      enemy.vx = Math.cos(enemy.angle) * enemy.speed * 2.1;
      enemy.vy = Math.sin(enemy.angle) * enemy.speed * 2.1;
    } else {
      enemy.vx = ux * enemy.speed * 0.45;
      enemy.vy = uy * enemy.speed * 0.45;
      if (enemy.dartTimer <= 0 && d < 420) {
        enemy.darting = 0.42;
        enemy.dartTimer = range(rng, 1.6, 2.8);
        enemy.angle = Math.atan2(dy, dx);
      }
    }
  } else if (enemy.kind === 'weaver') {
    enemy.fireTimer -= dt;
    if (d > 320) {
      enemy.vx = ux * enemy.speed;
      enemy.vy = uy * enemy.speed;
    } else if (d < 220) {
      enemy.vx = -ux * enemy.speed * 0.8;
      enemy.vy = -uy * enemy.speed * 0.8;
    } else {
      enemy.vx = -uy * enemy.speed * 0.5;
      enemy.vy = ux * enemy.speed * 0.5;
    }
    if (enemy.fireTimer <= 0 && d < 560) {
      enemy.fireTimer = range(rng, 1.7, 2.6);
      event = 'shoot';
    }
  } else if (enemy.kind === 'splitter') {
    enemy.vx = ux * enemy.speed;
    enemy.vy = uy * enemy.speed;
  } else if (enemy.kind === 'bulwark') {
    // Slow approach, then a telegraphed charge when close.
    enemy.dartTimer -= dt;
    if (enemy.darting > 0) {
      enemy.darting -= dt;
      enemy.vx = Math.cos(enemy.angle) * enemy.speed * 3.4;
      enemy.vy = Math.sin(enemy.angle) * enemy.speed * 3.4;
    } else {
      enemy.vx = ux * enemy.speed;
      enemy.vy = uy * enemy.speed;
      if (enemy.dartTimer <= 0 && d < 300) {
        enemy.darting = 0.55;
        enemy.dartTimer = range(rng, 3.2, 4.6);
        enemy.angle = Math.atan2(dy, dx);
      }
    }
  } else if (enemy.kind === 'boss') {
    enemy.fireTimer -= dt;
    enemy.summonTimer -= dt;
    enemy.chargeTimer -= dt;
    if (enemy.charging > 0) {
      enemy.charging -= dt;
      enemy.vx = Math.cos(enemy.chargeAngle) * enemy.speed * 4.6;
      enemy.vy = Math.sin(enemy.chargeAngle) * enemy.speed * 4.6;
    } else {
      enemy.vx = ux * enemy.speed * 0.6;
      enemy.vy = uy * enemy.speed * 0.6;
      if (enemy.chargeTimer <= 0 && d < 520) {
        enemy.charging = 0.7;
        enemy.chargeTimer = BOSS.chargeInterval;
        enemy.chargeAngle = Math.atan2(dy, dx);
      }
    }
    if (enemy.fireTimer <= 0) {
      enemy.fireTimer = BOSS.burstInterval;
      event = 'burst';
    } else if (enemy.summonTimer <= 0) {
      enemy.summonTimer = BOSS.summonInterval;
      event = 'summon';
    }
  }

  enemy.x = clamp(enemy.x + enemy.vx * dt, enemy.radius, ARENA.width - enemy.radius);
  enemy.y = clamp(enemy.y + enemy.vy * dt, enemy.radius, ARENA.height - enemy.radius);
  enemy.angle = Math.atan2(enemy.vy, enemy.vx);
  return event;
}
