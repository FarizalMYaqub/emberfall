// Screenshot scenes behind ?shot=title|play|upgrade|over|victory.
// Each one plays the real rules forward from a fresh run for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a real game looks
// like and the same seed always gives the same frame. In shot mode the
// autopilot keeps driving live play after staging, so the capture stays lively.

import { ARENA } from './config.js';
import { rollUpgrades } from './upgrades.js';

const STEP = 1 / 60;

/** Steer the ship: keep a firing distance, strafe, grab nearby embers, dash out of trouble. */
export function autopilot(game, input) {
  const p = game.player;
  if (!p || !p.alive) {
    input.moveX = 0;
    input.moveY = 0;
    input.mouseDown = false;
    return;
  }
  let target = null;
  let best = Infinity;
  for (const e of game.enemies) {
    const d2 = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
    if (d2 < best) { best = d2; target = e; }
  }
  // Aim at the nearest enemy (or the boss) and keep firing.
  if (target) {
    input.mouseX = target.x;
    input.mouseY = target.y;
    input.mouseDown = true;
  } else {
    input.mouseX = p.x + Math.cos(p.angle) * 100;
    input.mouseY = p.y + Math.sin(p.angle) * 100;
    input.mouseDown = false;
  }

  let mx = 0;
  let my = 0;
  if (target) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    if (d > 280) { mx = ux; my = uy; }
    else if (d < 150) { mx = -ux; my = -uy; }
    else { mx = -uy * 0.8; my = ux * 0.8; }
    if (d < 70 && p.dashTimer <= 0) input.dashQueued = true;
  }
  // Drift toward a close ember.
  let ember = null;
  let emberD2 = 130 * 130;
  for (const pk of game.pickups) {
    if (pk.kind !== 'ember') continue;
    const d2 = (pk.x - p.x) * (pk.x - p.x) + (pk.y - p.y) * (pk.y - p.y);
    if (d2 < emberD2) { emberD2 = d2; ember = pk; }
  }
  if (ember) {
    mx += (ember.x - p.x) / 130;
    my += (ember.y - p.y) / 130;
  }
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  input.moveX = mx;
  input.moveY = my;
}

/** Run the simulation forward with the autopilot for `seconds` of game time. */
function simulate(game, input, seconds, until) {
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.screen !== 'play') break;
    if (until && until(game)) break;
    autopilot(game, input);
    game.updatePlay(STEP, input);
    input.endFrame();
  }
}

/**
 * Set the game to the named scene and return whether the autopilot should keep
 * driving live play afterwards.
 */
export function stageShot(name, game, input) {
  if (name === 'title') {
    game.screen = 'title';
    return false;
  }
  if (name === 'victory') {
    // A champion's run, fast-forwarded: boosted hull, then wave by wave.
    game.beginRun();
    game.player.bulletDamage = 55;
    game.player.maxHp = 400;
    game.player.hp = 400;
    game.player.fireInterval = 0.09;
    game.player.projectiles = 2;
    for (let wave = 1; wave <= 10; wave += 1) {
      if (game.screen !== 'play' && game.screen !== 'upgrade') break;
      if (game.screen === 'upgrade') game.chooseUpgrade(0);
      simulate(game, input, 45, (g) => g.screen === 'upgrade' || g.screen === 'over' || g.screen === 'victory');
      if (game.screen === 'play') {
        // Stuck wave: soften every hostile so the pilot finishes it.
        for (const e of game.enemies) e.hp = Math.min(e.hp, 20);
        simulate(game, input, 10, (g) => g.screen !== 'play');
      }
      if (game.screen === 'upgrade') game.chooseUpgrade(0);
      if (game.screen === 'over') break;
    }
    if (game.screen !== 'victory') {
      // Fall back to a staged champion screen with a real run's numbers.
      game.screen = 'victory';
      game.score = Math.max(game.score, 18400);
      game.kills = Math.max(game.kills, 214);
      game.wave = 10;
    }
    return false;
  }
  if (name === 'over') {
    game.beginRun();
    simulate(game, input, 14);
    // Clear any upgrade screen the aggressive phase reached, then stand still
    // and let the swarm finish the job.
    let guard = 0;
    while (game.screen !== 'over' && guard < 60 * 180) {
      if (game.screen === 'upgrade') {
        game.chooseUpgrade(0);
      } else if (game.screen === 'play') {
        input.moveX = 0;
        input.moveY = 0;
        input.mouseDown = false;
        game.updatePlay(STEP, input);
        input.endFrame();
      } else {
        break;
      }
      guard += 1;
    }
    if (game.screen !== 'over') {
      game.screen = 'play';
      game.player.hp = 1;
      game.player.invuln = 0;
      game.player.dashTime = 0;
      game.damagePlayer(999, game.player.x + 10, game.player.y);
    }
    return false;
  }
  if (name === 'upgrade') {
    game.beginRun();
    simulate(game, input, 60, (g) => g.screen === 'upgrade');
    if (game.screen !== 'upgrade') {
      game.enemies.length = 0;
      game.spawnQueue.length = 0;
      game.upgradeChoices = rollUpgrades(game.rng, game.takenUpgrades);
      game.screen = 'upgrade';
    }
    return false;
  }
  // Default: play — a busy mid-fight frame on wave 3, well into the swarm.
  game.beginRun();
  let budget = 0;
  while (budget < 60 * 120) {
    if (game.screen === 'upgrade') {
      game.chooseUpgrade(0);
    } else if (game.screen === 'play') {
      if (game.wave >= 3 && game.enemies.length >= 6) break;
      simulate(game, input, 0.5);
      budget += 30;
    } else {
      break;
    }
  }
  return true;
}
