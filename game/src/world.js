// The simulation: player, bullets, waves, collisions, pickups, combo and score.
// Rendering lives in render.js; this file only moves numbers.

import { ARENA, PLAYER, COMBO, WAVES, ENEMIES, BOSS } from './config.js';
import { clamp, dist2, formatNumber, range } from './random.js';
import { makeEnemy, makeBoss, edgeSpawn, pickKind, updateEnemy } from './enemies.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';

export const SCREENS = ['title', 'play', 'upgrade', 'pause', 'over', 'victory'];

const STREAKS = [
  { at: 24, text: 'EMBERSTORM', color: '#ff9a3d' },
  { at: 16, text: 'UNSTOPPABLE', color: '#ff5da2' },
  { at: 8, text: 'RAMPAGE', color: '#ffe14d' },
];

export function createGame(rng, audio, particles) {
  const game = {
    screen: 'title',
    rng,
    time: 0,
    score: 0,
    best: 0,
    bestWave: 0,
    kills: 0,
    wave: 0,
    combo: 0,
    comboTimer: 0,
    mult: 1,
    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    pickups: [],
    spawnQueue: [],
    spawnTimer: 0,
    wavePhase: 'banner',
    bannerTimer: 0,
    bannerText: '',
    bannerSub: '',
    upgradeChoices: [],
    takenUpgrades: [],
    shake: 0,
    hitStop: 0,
    overdriveTimer: 0,
    announceText: '',
    announceColor: '#ffd166',
    announceTimer: 0,
    newBest: false,
    endless: false,
    shotsFired: 0,
    shotsHit: 0,
  };

  function freshPlayer() {
    return {
      x: ARENA.width / 2,
      y: ARENA.height / 2,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      radius: PLAYER.radius,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      speed: PLAYER.speed,
      fireInterval: PLAYER.fireInterval,
      fireTimer: 0,
      bulletDamage: PLAYER.bulletDamage,
      bulletSpeed: PLAYER.bulletSpeed,
      projectiles: 1,
      pierce: 0,
      crit: 0,
      dashCooldown: PLAYER.dashCooldown,
      dashTimer: 0,
      dashTime: 0,
      invuln: 0,
      regen: 0,
      regenTimer: 0,
      pickupRadius: PLAYER.pickupRadius,
      siphon: 0,
      siphonKills: 0,
      alive: true,
    };
  }

  function resetRun() {
    game.player = freshPlayer();
    game.bullets = [];
    game.enemyBullets = [];
    game.enemies = [];
    game.pickups = [];
    game.spawnQueue = [];
    game.score = 0;
    game.kills = 0;
    game.wave = 0;
    game.combo = 0;
    game.comboTimer = 0;
    game.mult = 1;
    game.takenUpgrades = [];
    game.upgradeChoices = [];
    game.overdriveTimer = 0;
    game.newBest = false;
    game.endless = false;
    game.shotsFired = 0;
    game.shotsHit = 0;
    particles.clear();
  }

  function startWave(n) {
    game.wave = n;
    game.wavePhase = 'banner';
    game.bannerTimer = 1.7;
    const isBoss = WAVES.bossWaves.includes(n);
    game.bannerText = isBoss ? BOSS.name : `WAVE ${n}`;
    game.bannerSub = isBoss
      ? 'Something huge stirs in the dark…'
      : n === 1
        ? 'Survive the swarm. Collect embers. Spend them on upgrades.'
        : `${WAVES.baseCount + WAVES.perWave * n} hostiles inbound`;
    const queue = [];
    if (isBoss) {
      queue.push('boss');
      const escorts = 4 + n;
      for (let i = 0; i < escorts; i += 1) queue.push(pickKind(rng, Math.max(1, n - 1)));
    } else {
      const count = WAVES.baseCount + WAVES.perWave * n;
      for (let i = 0; i < count; i += 1) queue.push(pickKind(rng, n));
    }
    // Shuffle the queue (boss stays first).
    for (let i = queue.length - 1; i > 1; i -= 1) {
      const j = 1 + Math.floor(rng() * i);
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    game.spawnQueue = queue;
    game.spawnTimer = 0.4;
    if (isBoss) audio.bossAlarm();
    else audio.waveHorn();
  }

  function beginRun() {
    resetRun();
    game.screen = 'play';
    startWave(1);
  }

  function addScore(base, x, y) {
    const gained = Math.round(base * game.mult);
    game.score += gained;
    if (x !== undefined) particles.floatText(x, y, `+${formatNumber(gained)}`, '#ffd166', 15);
    return gained;
  }

  function announce(text, color) {
    game.announceText = text;
    game.announceColor = color;
    game.announceTimer = 1.6;
  }

  function bumpCombo() {
    game.combo += 1;
    game.comboTimer = COMBO.window;
    game.mult = Math.min(COMBO.maxMult, 1 + Math.floor(game.combo / COMBO.perStep));
    for (const s of STREAKS) {
      if (game.combo === s.at) announce(s.text, s.color);
    }
  }

  function dropPickups(enemy) {
    for (let i = 0; i < enemy.emberDrop; i += 1) {
      game.pickups.push({
        kind: 'ember',
        x: enemy.x + range(rng, -14, 14),
        y: enemy.y + range(rng, -14, 14),
        vx: range(rng, -40, 40),
        vy: range(rng, -40, 40),
        value: 5,
        life: 14,
      });
    }
    const roll = rng();
    if (roll < 0.045) {
      game.pickups.push({ kind: 'heart', x: enemy.x, y: enemy.y, vx: 0, vy: 0, value: 22, life: 12 });
    } else if (roll < 0.075) {
      game.pickups.push({ kind: 'overdrive', x: enemy.x, y: enemy.y, vx: 0, vy: 0, value: 8, life: 12 });
    }
  }

  function killEnemy(enemy, index) {
    game.enemies.splice(index, 1);
    game.kills += 1;
    bumpCombo();
    addScore(enemy.score, enemy.x, enemy.y - enemy.radius - 6);
    particles.explosion(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' || enemy.kind === 'bulwark');
    game.shake = Math.min(14, game.shake + (enemy.kind === 'boss' ? 14 : enemy.kind === 'bulwark' ? 7 : 3));
    if (enemy.kind === 'boss' || enemy.kind === 'bulwark') game.hitStop = 0.07;
    audio.enemyDie();
    dropPickups(enemy);
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 3; i += 1) {
        const mote = makeEnemy('mote', enemy.x + range(rng, -20, 20), enemy.y + range(rng, -20, 20), game.wave, rng);
        mote.hp = mote.maxHp;
        game.enemies.push(mote);
      }
    }
    if (game.player.siphon > 0) {
      game.player.siphonKills += 1;
      if (game.player.siphonKills >= 10) {
        game.player.siphonKills = 0;
        game.player.hp = Math.min(game.player.maxHp, game.player.hp + 2);
        particles.floatText(game.player.x, game.player.y - 24, '+2', '#3dff8e', 14);
      }
    }
  }

  function damagePlayer(amount, fromX, fromY) {
    const p = game.player;
    if (!p.alive || p.invuln > 0 || p.dashTime > 0) return;
    p.hp -= amount;
    p.invuln = 0.55;
    game.shake = Math.min(16, game.shake + 6);
    game.combo = 0;
    game.mult = 1;
    particles.burst(p.x, p.y, '#ff4d6d', 14, 260, 0.5, 3);
    audio.playerHit();
    const dx = p.x - fromX;
    const dy = p.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    p.vx += (dx / d) * 260;
    p.vy += (dy / d) * 260;
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      particles.explosion(p.x, p.y, '#5df2ff', true);
      game.shake = 18;
      game.hitStop = 0.12;
      audio.gameOver();
      finishRun(false);
    }
  }

  function finishRun(won) {
    const isBest = game.score > game.best;
    if (isBest) {
      game.best = game.score;
      game.newBest = true;
    }
    if (game.wave > game.bestWave) game.bestWave = game.wave;
    try {
      localStorage.setItem('emberfall-best', String(game.best));
      localStorage.setItem('emberfall-best-wave', String(game.bestWave));
    } catch { /* storage unavailable: best score lives only this session */ }
    game.screen = won ? 'victory' : 'over';
    if (won) audio.victory();
  }

  function fireBullets() {
    const p = game.player;
    const n = p.projectiles;
    const spread = 0.10;
    for (let i = 0; i < n; i += 1) {
      const offset = (i - (n - 1) / 2) * spread;
      const a = p.angle + offset;
      const crit = rng() < p.crit;
      game.bullets.push({
        x: p.x + Math.cos(a) * (p.radius + 10),
        y: p.y + Math.sin(a) * (p.radius + 10),
        vx: Math.cos(a) * p.bulletSpeed,
        vy: Math.sin(a) * p.bulletSpeed,
        radius: PLAYER.bulletRadius,
        damage: p.bulletDamage * (crit ? 2 : 1),
        pierce: p.pierce,
        crit,
        life: 1.1,
      });
    }
    game.shotsFired += 1;
    audio.shoot();
  }

  function dash() {
    const p = game.player;
    if (p.dashTimer > 0 || !p.alive) return;
    const mx = p.vx;
    const my = p.vy;
    const moving = Math.hypot(mx, my) > 20;
    const angle = moving ? Math.atan2(my, mx) : p.angle;
    p.vx = Math.cos(angle) * PLAYER.dashSpeed;
    p.vy = Math.sin(angle) * PLAYER.dashSpeed;
    p.dashTime = PLAYER.dashTime;
    p.dashTimer = p.dashCooldown;
    p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
    particles.ring(p.x, p.y, '#5df2ff', 46, 2.5);
    audio.dash();
  }

  function updatePlay(dt, input) {
    const p = game.player;
    game.time += dt;
    if (game.hitStop > 0) {
      game.hitStop -= dt;
      dt *= 0.12;
    }
    if (game.announceTimer > 0) game.announceTimer -= dt;
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 26);
    if (game.comboTimer > 0) {
      game.comboTimer -= dt;
      if (game.comboTimer <= 0) {
        game.combo = 0;
        game.mult = 1;
      }
    }
    if (game.overdriveTimer > 0) game.overdriveTimer -= dt;

    // Banner phase: show the wave card, then start spawning.
    if (game.wavePhase === 'banner') {
      game.bannerTimer -= dt;
      if (game.bannerTimer <= 0) game.wavePhase = 'fight';
    }

    // Spawning.
    if (game.wavePhase === 'fight' && game.spawnQueue.length > 0) {
      game.spawnTimer -= dt;
      const interval = Math.max(WAVES.spawnIntervalMin, WAVES.spawnInterval - game.wave * 0.045);
      if (game.spawnTimer <= 0) {
        game.spawnTimer = interval;
        const kind = game.spawnQueue.shift();
        const pos = edgeSpawn(rng, p);
        const enemy = kind === 'boss'
          ? makeBoss(pos.x, pos.y, game.wave)
          : makeEnemy(kind, pos.x, pos.y, game.wave, rng);
        game.enemies.push(enemy);
        particles.ring(pos.x, pos.y, enemy.color, enemy.radius + 26, 2);
      }
    }

    // Player movement.
    if (p.alive) {
      if (p.dashTime > 0) {
        p.dashTime -= dt;
        particles.trail(p.x, p.y, '#5df2ff', 9);
      } else {
        p.vx += input.moveX * PLAYER.accel * dt;
        p.vy += input.moveY * PLAYER.accel * dt;
        const f = Math.max(0, 1 - PLAYER.friction * dt);
        p.vx *= f;
        p.vy *= f;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > p.speed) {
          p.vx = (p.vx / sp) * p.speed;
          p.vy = (p.vy / sp) * p.speed;
        }
      }
      p.x = clamp(p.x + p.vx * dt, ARENA.margin, ARENA.width - ARENA.margin);
      p.y = clamp(p.y + p.vy * dt, ARENA.margin, ARENA.height - ARENA.margin);
      p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
      if (p.dashTimer > 0) p.dashTimer -= dt;
      if (p.invuln > 0) p.invuln -= dt;
      if (p.regen > 0) {
        p.regenTimer += dt;
        if (p.regenTimer >= 1) {
          p.regenTimer = 0;
          p.hp = Math.min(p.maxHp, p.hp + p.regen);
        }
      }
      if (input.dashQueued) dash();
      p.fireTimer -= dt;
      const interval = game.overdriveTimer > 0 ? p.fireInterval * 0.45 : p.fireInterval;
      if (input.mouseDown && p.fireTimer <= 0) {
        p.fireTimer = interval;
        fireBullets();
      }
      // Engine trail.
      if (Math.hypot(p.vx, p.vy) > 60 && rng() < 0.6) {
        particles.trail(
          p.x - Math.cos(p.angle) * p.radius,
          p.y - Math.sin(p.angle) * p.radius,
          '#ff9a3d', 5,
        );
      }
    }

    // Enemies.
    for (const enemy of game.enemies) {
      const event = updateEnemy(enemy, dt, p, rng);
      if (event === 'shoot') {
        const a = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        game.enemyBullets.push({
          x: enemy.x, y: enemy.y,
          vx: Math.cos(a) * 265, vy: Math.sin(a) * 265,
          radius: 7, damage: enemy.damage, life: 4,
        });
        audio.enemyHit();
      } else if (event === 'burst') {
        for (let i = 0; i < 12; i += 1) {
          const a = (i / 12) * Math.PI * 2 + enemy.wobble;
          game.enemyBullets.push({
            x: enemy.x + Math.cos(a) * enemy.radius,
            y: enemy.y + Math.sin(a) * enemy.radius,
            vx: Math.cos(a) * 205, vy: Math.sin(a) * 205,
            radius: 7, damage: 14, life: 5,
          });
        }
        particles.ring(enemy.x, enemy.y, '#ff2e63', enemy.radius + 60, 3);
        audio.enemyDie();
      } else if (event === 'summon') {
        for (let i = 0; i < 3; i += 1) {
          const mote = makeEnemy('mote', enemy.x + range(rng, -50, 50), enemy.y + range(rng, -50, 50), game.wave, rng);
          game.enemies.push(mote);
        }
        particles.ring(enemy.x, enemy.y, '#ff5da2', enemy.radius + 40, 2.5);
      }
    }

    // Player bullets.
    for (let i = game.bullets.length - 1; i >= 0; i -= 1) {
      const b = game.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
      if (!dead) {
        for (let j = game.enemies.length - 1; j >= 0; j -= 1) {
          const e = game.enemies[j];
          if (e.spawnAge < 0.25) continue;
          const rr = e.radius + b.radius;
          if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
            e.hp -= b.damage;
            e.flash = 0.09;
            game.shotsHit += 1;
            particles.burst(b.x, b.y, e.color, 4, 180, 0.3, 2.2);
            if (b.crit) particles.floatText(e.x, e.y - e.radius - 4, 'CRIT', '#ffe14d', 13);
            audio.enemyHit();
            if (e.hp <= 0) killEnemy(e, j);
            if (b.pierce > 0) {
              b.pierce -= 1;
            } else {
              dead = true;
            }
            break;
          }
        }
      }
      if (dead) game.bullets.splice(i, 1);
    }

    // Enemy bullets.
    for (let i = game.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = game.enemyBullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
      if (!dead && p.alive) {
        const rr = p.radius * 0.8 + b.radius;
        if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
          damagePlayer(b.damage, b.x - b.vx, b.y - b.vy);
          dead = true;
        }
      }
      if (dead) game.enemyBullets.splice(i, 1);
    }

    // Contact damage.
    if (p.alive) {
      for (const e of game.enemies) {
        if (e.spawnAge < 0.25) continue;
        const rr = e.radius + p.radius * 0.85;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
          damagePlayer(e.damage, e.x, e.y);
          break;
        }
      }
    }

    // Pickups.
    for (let i = game.pickups.length - 1; i >= 0; i -= 1) {
      const pk = game.pickups[i];
      pk.life -= dt;
      if (pk.life <= 0) { game.pickups.splice(i, 1); continue; }
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      pk.vx *= Math.max(0, 1 - 2.4 * dt);
      pk.vy *= Math.max(0, 1 - 2.4 * dt);
      if (p.alive) {
        const d2 = dist2(pk.x, pk.y, p.x, p.y);
        const pr = pk.kind === 'ember' ? p.pickupRadius : p.pickupRadius * 0.8;
        if (d2 < pr * pr) {
          const d = Math.sqrt(d2) || 1;
          const pull = pk.kind === 'ember' ? 900 : 620;
          pk.vx += ((p.x - pk.x) / d) * pull * dt;
          pk.vy += ((p.y - pk.y) / d) * pull * dt;
        }
        const rr = p.radius + 12;
        if (d2 < rr * rr) {
          if (pk.kind === 'ember') {
            addScore(pk.value, pk.x, pk.y - 8);
            particles.burst(pk.x, pk.y, '#ff9a3d', 3, 120, 0.3, 2);
            audio.pickup();
          } else if (pk.kind === 'heart') {
            p.hp = Math.min(p.maxHp, p.hp + pk.value);
            particles.floatText(p.x, p.y - 26, `+${pk.value} HULL`, '#3dff8e', 15);
            audio.heart();
          } else {
            game.overdriveTimer = pk.value;
            particles.floatText(p.x, p.y - 26, 'OVERDRIVE!', '#ffe14d', 17);
            audio.overdrive();
          }
          game.pickups.splice(i, 1);
        }
      }
    }

    // Wave cleared?
    if (game.wavePhase === 'fight' && game.spawnQueue.length === 0 && game.enemies.length === 0 && p.alive) {
      addScore(WAVES.clearBonus);
      announce(`WAVE ${game.wave} CLEAR  +${WAVES.clearBonus}`, '#3dff8e');
      if (game.wave === WAVES.victoryWave && !game.endless) {
        finishRun(true);
      } else {
        game.wavePhase = 'cleared';
        game.upgradeChoices = rollUpgrades(rng, game.takenUpgrades);
        game.screen = 'upgrade';
        audio.upgrade();
      }
    }

    particles.update(dt);
  }

  function chooseUpgrade(index) {
    const choice = game.upgradeChoices[index];
    if (!choice || game.screen !== 'upgrade') return;
    applyUpgrade(game.player, choice);
    game.takenUpgrades.push(choice.id);
    particles.floatText(game.player.x, game.player.y - 30, choice.name.toUpperCase(), '#5df2ff', 16);
    audio.upgrade();
    game.screen = 'play';
    startWave(game.wave + 1);
  }

  function loadBest() {
    try {
      game.best = Number(localStorage.getItem('emberfall-best') || 0) || 0;
      game.bestWave = Number(localStorage.getItem('emberfall-best-wave') || 0) || 0;
    } catch { /* no storage */ }
  }

  loadBest();
  game.player = freshPlayer();

  game.beginRun = beginRun;
  game.startWave = startWave;
  game.chooseUpgrade = chooseUpgrade;
  game.updatePlay = updatePlay;
  game.damagePlayer = damagePlayer;
  game.addScore = addScore;
  return game;
}
