// All drawing: background, entities, HUD and every screen.
// Nothing here changes the simulation; it only reads the game.

import { ARENA, PALETTE, WAVES } from './config.js';
import { formatNumber, mulberry32 } from './random.js';

const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
const TITLE_FONT = '"Arial Black", "Segoe UI", system-ui, sans-serif';

const starRng = mulberry32(1337);
const STARS = [];
for (let i = 0; i < 130; i += 1) {
  STARS.push({
    x: starRng() * ARENA.width,
    y: starRng() * ARENA.height,
    r: 0.5 + starRng() * 1.6,
    tw: starRng() * Math.PI * 2,
    sp: 0.6 + starRng() * 1.8,
  });
}
const NEBULAE = [
  { x: 240, y: 170, r: 260, c: 'rgba(124, 58, 237, 0.16)' },
  { x: 1040, y: 560, r: 300, c: 'rgba(255, 90, 120, 0.10)' },
  { x: 980, y: 120, r: 220, c: 'rgba(45, 212, 191, 0.09)' },
  { x: 180, y: 600, r: 200, c: 'rgba(255, 154, 61, 0.08)' },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  g.addColorStop(0, PALETTE.bg1);
  g.addColorStop(0.55, PALETTE.bg0);
  g.addColorStop(1, PALETTE.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  for (const n of NEBULAE) {
    const drift = Math.sin(time * 0.05 + n.x) * 12;
    glowCircle(ctx, n.x + drift, n.y, n.r, n.c, 1);
  }

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 80; x < ARENA.width; x += 80) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
  }
  for (let y = 80; y < ARENA.height; y += 80) {
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
  }
  ctx.stroke();

  for (const s of STARS) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * s.sp + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Arena frame.
  ctx.strokeStyle = 'rgba(93, 242, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, ARENA.width - 28, ARENA.height - 28);
  ctx.strokeStyle = 'rgba(93, 242, 255, 0.10)';
  ctx.lineWidth = 6;
  ctx.strokeRect(17, 17, ARENA.width - 34, ARENA.height - 34);
}

function drawPlayer(ctx, game, time) {
  const p = game.player;
  if (!p.alive) return;
  const blink = p.invuln > 0 && Math.floor(time * 18) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.35;
  glowCircle(ctx, 0, 0, 44, 'rgba(93, 242, 255, 0.35)', 1);
  ctx.rotate(p.angle);
  // Hull: sleek dart.
  ctx.fillStyle = '#0e2a3a';
  ctx.strokeStyle = PALETTE.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cockpit.
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Engine flame.
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > 40) {
    const fl = 10 + Math.random() * 8 + speed * 0.02;
    const fg = ctx.createLinearGradient(-10, 0, -10 - fl, 0);
    fg.addColorStop(0, 'rgba(255, 209, 102, 0.95)');
    fg.addColorStop(1, 'rgba(255, 90, 60, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-10 - fl, 0);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(ctx, e, time) {
  const scaleIn = e.spawnAge < 0.25 ? e.spawnAge / 0.25 : 1;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(scaleIn, scaleIn);
  ctx.globalAlpha = Math.min(1, 0.35 + scaleIn);
  glowCircle(ctx, 0, 0, e.radius * 2.1, e.color, 0.28);
  ctx.rotate(e.angle);
  const flash = e.flash > 0;
  ctx.fillStyle = flash ? '#ffffff' : e.color;
  ctx.strokeStyle = flash ? '#ffffff' : e.core;
  ctx.lineWidth = 1.8;

  if (e.kind === 'mote') {
    // Spiked orb.
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + time * 1.5;
      const r = i % 2 === 0 ? e.radius : e.radius * 0.62;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'stinger') {
    ctx.beginPath();
    ctx.moveTo(e.radius + 4, 0);
    ctx.lineTo(-e.radius * 0.7, -e.radius * 0.75);
    ctx.lineTo(-e.radius * 0.3, 0);
    ctx.lineTo(-e.radius * 0.7, e.radius * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'weaver') {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + time * 0.8;
      const x = Math.cos(a) * e.radius;
      const y = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = e.core;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'splitter') {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = e.core;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.7, 0);
    ctx.lineTo(e.radius * 0.7, 0);
    ctx.moveTo(0, -e.radius * 0.7);
    ctx.lineTo(0, e.radius * 0.7);
    ctx.stroke();
  } else if (e.kind === 'bulwark') {
    ctx.rotate(-e.angle);
    ctx.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
    ctx.strokeRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
    ctx.fillStyle = e.core;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'boss') {
    // The Maw: a toothed ring around a burning core.
    ctx.rotate(-e.angle);
    ctx.beginPath();
    const teeth = 12;
    for (let i = 0; i < teeth * 2; i += 1) {
      const a = (i / (teeth * 2)) * Math.PI * 2 + time * 0.5;
      const r = i % 2 === 0 ? e.radius : e.radius * 0.78;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = e.core;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.42 + Math.sin(time * 6) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a0010';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // HP bar for hurt enemies.
  if (e.hp < e.maxHp && e.kind !== 'mote') {
    const w = e.radius * 2;
    const y = e.y - e.radius - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, y, w, 5);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawBullets(ctx, game) {
  for (const b of game.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    glowCircle(ctx, 0, 0, 14, b.crit ? '#ffe14d' : '#5df2ff', 0.5);
    ctx.fillStyle = b.crit ? '#fff3c4' : '#eafcff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const b of game.enemyBullets) {
    glowCircle(ctx, b.x, b.y, 16, '#ff2e63', 0.45);
    ctx.fillStyle = '#ff5c7a';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7e0';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups(ctx, game, time) {
  for (const pk of game.pickups) {
    const pulse = 1 + Math.sin(time * 5 + pk.x) * 0.15;
    const blink = pk.life < 3 ? (Math.floor(time * 8) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(pk.x, pk.y);
    if (pk.kind === 'ember') {
      glowCircle(ctx, 0, 0, 16, '#ff9a3d', 0.55);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(-4.5 * pulse, -4.5 * pulse, 9 * pulse, 9 * pulse);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-2, -2, 4, 4);
    } else if (pk.kind === 'heart') {
      glowCircle(ctx, 0, 0, 20, '#3dff8e', 0.55);
      ctx.fillStyle = '#3dff8e';
      ctx.fillRect(-3, -8, 6, 16);
      ctx.fillRect(-8, -3, 16, 6);
    } else {
      glowCircle(ctx, 0, 0, 22, '#ffe14d', 0.6);
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 10 * pulse : 4.5 * pulse;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawHud(ctx, game) {
  const p = game.player;
  ctx.textBaseline = 'alphabetic';

  // Top-left: hull bar.
  ctx.fillStyle = 'rgba(5, 8, 20, 0.6)';
  roundRect(ctx, 24, 24, 250, 46, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('HULL', 34, 40);
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, 34, 46, 190, 12, 6);
  ctx.fill();
  ctx.fillStyle = hpFrac > 0.35 ? PALETTE.hp : PALETTE.hpLow;
  if (hpFrac > 0) {
    roundRect(ctx, 34, 46, 190 * hpFrac, 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 264, 58);
  if (game.overdriveTimer > 0) {
    ctx.fillStyle = '#ffe14d';
    ctx.font = `700 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`OVERDRIVE ${game.overdriveTimer.toFixed(1)}s`, 34, 86);
  }

  // Top-center: wave + hostiles left.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `800 20px ${FONT}`;
  const boss = game.enemies.find((e) => e.kind === 'boss');
  ctx.fillText(boss ? 'THE MAW' : `WAVE ${Math.max(1, game.wave)}`, ARENA.width / 2, 44);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 12px ${FONT}`;
  const left = game.enemies.length + game.spawnQueue.length;
  ctx.fillText(game.wavePhase === 'banner' ? 'GET READY' : `${left} HOSTILE${left === 1 ? '' : 'S'} LEFT`, ARENA.width / 2, 62);
  if (boss) {
    const w = 340;
    const y = 70;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, ARENA.width / 2 - w / 2, y, w, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#ff2e63';
    roundRect(ctx, ARENA.width / 2 - w / 2, y, w * Math.max(0, boss.hp / boss.maxHp), 10, 5);
    ctx.fill();
  }

  // Top-right: score, combo, best.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText('SCORE', ARENA.width - 24, 40);
  ctx.fillStyle = PALETTE.score;
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText(formatNumber(game.score), ARENA.width - 24, 64);
  if (game.mult > 1) {
    ctx.fillStyle = game.mult >= 5 ? '#ff5da2' : '#ffe14d';
    ctx.font = `800 15px ${FONT}`;
    ctx.fillText(`COMBO ×${game.mult}  (${game.combo})`, ARENA.width - 24, 86);
  } else {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(`BEST ${formatNumber(game.best)}`, ARENA.width - 24, 86);
  }

  // Bottom-center: dash cooldown.
  const p2 = game.player;
  const dashFrac = p2.dashTimer <= 0 ? 1 : 1 - p2.dashTimer / p2.dashCooldown;
  const w = 130;
  const x = ARENA.width / 2 - w / 2;
  const y = ARENA.height - 30;
  ctx.fillStyle = 'rgba(5, 8, 20, 0.6)';
  roundRect(ctx, x - 8, y - 6, w + 16, 22, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, x, y, w, 8, 4);
  ctx.fill();
  ctx.fillStyle = dashFrac >= 1 ? PALETTE.player : 'rgba(93, 242, 255, 0.55)';
  if (dashFrac > 0) {
    roundRect(ctx, x, y, w * dashFrac, 8, 4);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `700 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(dashFrac >= 1 ? 'DASH READY  [SPACE]' : 'DASH…', ARENA.width / 2, y - 12);
}

function drawBanner(ctx, game) {
  if (game.wavePhase !== 'banner') return;
  const t = 1 - Math.max(0, game.bannerTimer) / 1.7;
  const scale = t < 0.15 ? 0.7 + (t / 0.15) * 0.3 : 1;
  const alpha = game.bannerTimer < 0.4 ? Math.max(0, game.bannerTimer / 0.4) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(ARENA.width / 2, 250);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.fillStyle = game.bannerText === 'THE MAW' ? '#ff2e63' : PALETTE.bright;
  ctx.font = `900 64px ${TITLE_FONT}`;
  ctx.shadowColor = game.bannerText === 'THE MAW' ? '#ff2e63' : '#7c3aed';
  ctx.shadowBlur = 34;
  ctx.fillText(game.bannerText, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText(game.bannerSub, 0, 36);
  ctx.restore();
}

function drawAnnounce(ctx, game) {
  if (game.announceTimer <= 0) return;
  const a = Math.min(1, game.announceTimer / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = game.announceColor;
  ctx.font = `900 30px ${TITLE_FONT}`;
  ctx.shadowColor = game.announceColor;
  ctx.shadowBlur = 22;
  ctx.fillText(game.announceText, ARENA.width / 2, 150);
  ctx.restore();
}

function drawCrosshair(ctx, input) {
  const x = input.mouseX;
  const y = input.mouseY;
  ctx.strokeStyle = 'rgba(93, 242, 255, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 16, y);
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y + 16);
  ctx.stroke();
  ctx.fillStyle = '#eafcff';
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 2, 12, ${alpha})`;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
}

function button(ctx, rect, label, sub, hovered, accent) {
  ctx.fillStyle = hovered ? 'rgba(93, 242, 255, 0.22)' : 'rgba(10, 14, 32, 0.85)';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.strokeStyle = hovered ? PALETTE.player : 'rgba(93, 242, 255, 0.45)';
  ctx.lineWidth = hovered ? 2.5 : 1.5;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || PALETTE.bright;
  ctx.font = `800 ${sub ? 19 : 21}px ${FONT}`;
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + (sub ? 1 : 7));
  if (sub) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 22);
  }
}

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function drawTitle(ctx, game, input, time) {
  game.buttons = {};
  // Drifting embers behind the title.
  for (let i = 0; i < 26; i += 1) {
    const s = STARS[i];
    const yy = ARENA.height - ((time * 22 + s.y * 3) % (ARENA.height + 40));
    ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(time + s.tw));
    ctx.fillStyle = i % 3 === 0 ? '#ff9a3d' : '#ff5da2';
    ctx.beginPath();
    ctx.arc(s.x, yy, s.r + 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  const pulse = 1 + Math.sin(time * 2.2) * 0.015;
  ctx.save();
  ctx.translate(ARENA.width / 2, 208);
  ctx.scale(pulse, pulse);
  const grad = ctx.createLinearGradient(0, -58, 0, 10);
  grad.addColorStop(0, '#fff3c4');
  grad.addColorStop(0.45, '#ff9a3d');
  grad.addColorStop(1, '#ff2e63');
  ctx.fillStyle = grad;
  ctx.font = `900 92px ${TITLE_FONT}`;
  ctx.shadowColor = '#ff5c1f';
  ctx.shadowBlur = 42;
  ctx.fillText('EMBERFALL', 0, 0);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText('A NEON ARENA SURVIVAL — OUTLAST THE SWARM, FEED THE FIRE', ARENA.width / 2, 252);

  // Controls card.
  ctx.fillStyle = 'rgba(8, 10, 26, 0.72)';
  roundRect(ctx, ARENA.width / 2 - 330, 292, 660, 108, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(93, 242, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, ARENA.width / 2 - 330, 292, 660, 108, 12);
  ctx.stroke();
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `700 15px ${FONT}`;
  const rows = [
    ['MOVE', 'WASD / ARROW KEYS'],
    ['AIM + FIRE', 'MOUSE — HOLD LEFT CLICK'],
    ['DASH', 'SPACE — BRIEF INVULNERABILITY'],
    ['PAUSE / MUTE', 'P  /  M'],
  ];
  rows.forEach((row, i) => {
    const y = 322 + i * 20;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.player;
    ctx.fillText(row[0], ARENA.width / 2 - 40, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.bright;
    ctx.fillText(row[1], ARENA.width / 2 - 24, y);
  });

  if (game.best > 0) {
    ctx.fillStyle = PALETTE.score;
    ctx.font = `800 17px ${FONT}`;
    ctx.fillText(`BEST  ${formatNumber(game.best)}   ·   WAVE ${game.bestWave}`, ARENA.width / 2, 436);
  }

  const startRect = { x: ARENA.width / 2 - 150, y: 466, w: 300, h: 62 };
  game.buttons.start = startRect;
  button(ctx, startRect, '▶  START RUN', 'or press ENTER', inside(startRect, input.mouseX, input.mouseY), '#5df2ff');

  const blink = 0.72 + 0.28 * Math.sin(time * 3.2);
  ctx.globalAlpha = blink;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('10 WAVES. ONE BOSS EVERY FIVE. SLAY THE MAW ON WAVE 10 TO WIN.', ARENA.width / 2, 566);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(143, 134, 184, 0.8)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('Sound is synthesized live — no audio files.  Best played with sound on.', ARENA.width / 2, 692);
}

function drawUpgrade(ctx, game, input) {
  game.buttons = {};
  dim(ctx, 0.72);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hp;
  ctx.font = `900 40px ${TITLE_FONT}`;
  ctx.shadowColor = '#3dff8e';
  ctx.shadowBlur = 24;
  ctx.fillText(`WAVE ${game.wave} CLEAR`, ARENA.width / 2, 138);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText('Choose one upgrade — the swarm grows stronger every wave.', ARENA.width / 2, 172);

  const cardW = 268;
  const cardH = 210;
  const gap = 28;
  const totalW = cardW * 3 + gap * 2;
  const x0 = (ARENA.width - totalW) / 2;
  const y0 = 218;
  game.upgradeChoices.forEach((u, i) => {
    const rect = { x: x0 + i * (cardW + gap), y: y0, w: cardW, h: cardH };
    game.buttons[`upgrade${i}`] = rect;
    const hovered = inside(rect, input.mouseX, input.mouseY);
    ctx.fillStyle = hovered ? 'rgba(93, 242, 255, 0.16)' : 'rgba(10, 14, 32, 0.9)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    ctx.fill();
    ctx.strokeStyle = hovered ? PALETTE.player : 'rgba(146, 90, 255, 0.55)';
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    ctx.stroke();
    ctx.fillStyle = PALETTE.emberHot;
    ctx.font = `400 44px ${FONT}`;
    ctx.fillText(u.icon, rect.x + rect.w / 2, rect.y + 66);
    ctx.fillStyle = PALETTE.bright;
    ctx.font = `800 19px ${FONT}`;
    ctx.fillText(u.name.toUpperCase(), rect.x + rect.w / 2, rect.y + 106);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 14px ${FONT}`;
    wrapText(ctx, u.desc, rect.x + rect.w / 2, rect.y + 134, cardW - 36, 20);
    ctx.fillStyle = PALETTE.player;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText(`PRESS ${i + 1}`, rect.x + rect.w / 2, rect.y + cardH - 18);
  });

  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText(`SCORE ${formatNumber(game.score)}   ·   HULL ${Math.ceil(game.player.hp)}/${game.player.maxHp}`, ARENA.width / 2, 486);
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}

function statRow(ctx, label, value, x, y, w) {
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText(value, x + w, y);
}

function drawOver(ctx, game, input, time) {
  game.buttons = {};
  dim(ctx, 0.62);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4d6d';
  ctx.font = `900 58px ${TITLE_FONT}`;
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = 30;
  ctx.fillText('SIGNAL LOST', ARENA.width / 2, 168);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText('The swarm takes the arena… this time.', ARENA.width / 2, 202);

  if (game.newBest) {
    const blink = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ffe14d';
    ctx.font = `900 22px ${TITLE_FONT}`;
    ctx.fillText('★ NEW BEST SCORE ★', ARENA.width / 2, 244);
    ctx.globalAlpha = 1;
  }

  const x = ARENA.width / 2 - 190;
  const w = 380;
  ctx.fillStyle = 'rgba(8, 10, 26, 0.72)';
  roundRect(ctx, x - 20, 268, w + 40, 176, 12);
  ctx.fill();
  statRow(ctx, 'FINAL SCORE', formatNumber(game.score), x, 306, w);
  statRow(ctx, 'BEST SCORE', formatNumber(game.best), x, 340, w);
  statRow(ctx, 'WAVE REACHED', String(Math.max(1, game.wave)), x, 374, w);
  statRow(ctx, 'KILLS', formatNumber(game.kills), x, 408, w);
  const acc = game.shotsFired > 0 ? `${Math.round((game.shotsHit / game.shotsFired) * 100)}%` : '—';
  statRow(ctx, 'ACCURACY', acc, x, 442 - 14 + 14, w);

  const rect = { x: ARENA.width / 2 - 150, y: 486, w: 300, h: 62 };
  game.buttons.restart = rect;
  button(ctx, rect, '↻  PLAY AGAIN', 'or press R', inside(rect, input.mouseX, input.mouseY), '#5df2ff');
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('TIP: DASH THROUGH BULLETS — YOU ARE INVULNERABLE MID-DASH.', ARENA.width / 2, 586);
}

function drawVictory(ctx, game, input, time) {
  game.buttons = {};
  dim(ctx, 0.6);
  ctx.textAlign = 'center';
  const grad = ctx.createLinearGradient(0, 110, 0, 190);
  grad.addColorStop(0, '#fff3c4');
  grad.addColorStop(0.5, '#ff9a3d');
  grad.addColorStop(1, '#ff2e63');
  ctx.fillStyle = grad;
  ctx.font = `900 60px ${TITLE_FONT}`;
  ctx.shadowColor = '#ff9a3d';
  ctx.shadowBlur = 36;
  ctx.fillText('ARENA CHAMPION', ARENA.width / 2, 176);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText('The Maw is dust. Wave 10 is yours — the arena is yours.', ARENA.width / 2, 212);

  const x = ARENA.width / 2 - 190;
  const w = 380;
  ctx.fillStyle = 'rgba(8, 10, 26, 0.72)';
  roundRect(ctx, x - 20, 244, w + 40, 142, 12);
  ctx.fill();
  statRow(ctx, 'FINAL SCORE', formatNumber(game.score), x, 282, w);
  statRow(ctx, 'BEST SCORE', formatNumber(game.best), x, 316, w);
  statRow(ctx, 'KILLS', formatNumber(game.kills), x, 350, w);
  const acc = game.shotsFired > 0 ? `${Math.round((game.shotsHit / game.shotsFired) * 100)}%` : '—';
  statRow(ctx, 'ACCURACY', acc, x, 384, w);

  const cRect = { x: ARENA.width / 2 - 230, y: 430, w: 220, h: 58 };
  const rRect = { x: ARENA.width / 2 + 10, y: 430, w: 220, h: 58 };
  game.buttons.continue = cRect;
  game.buttons.restart = rRect;
  button(ctx, cRect, 'ENDLESS MODE', 'keep fighting', inside(cRect, input.mouseX, input.mouseY), '#ffd166');
  button(ctx, rRect, '↻  PLAY AGAIN', 'or press R', inside(rRect, input.mouseX, input.mouseY), '#5df2ff');
  const blink = 0.55 + 0.45 * Math.sin(time * 3);
  ctx.globalAlpha = blink;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('ENDLESS MODE: WAVES KEEP COMING, FOREVER HARDER.', ARENA.width / 2, 528);
  ctx.globalAlpha = 1;
}

function drawPause(ctx, game, input) {
  game.buttons = {};
  dim(ctx, 0.66);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.bright;
  ctx.font = `900 52px ${TITLE_FONT}`;
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 26;
  ctx.fillText('PAUSED', ARENA.width / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 16px ${FONT}`;
  ctx.fillText('Take a breath. The swarm waits.', ARENA.width / 2, 336);
  const rect = { x: ARENA.width / 2 - 130, y: 380, w: 260, h: 56 };
  game.buttons.resume = rect;
  button(ctx, rect, '▶  RESUME', 'or press P / ESC', inside(rect, input.mouseX, input.mouseY), '#5df2ff');
}

/** Draw one frame. `view` is { shakeX, shakeY } applied to the world layer. */
export function drawGame(ctx, game, input, time) {
  ctx.save();
  const sx = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const sy = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  drawBackground(ctx, time);
  ctx.translate(sx, sy);

  const inWorld = game.screen === 'play' || game.screen === 'upgrade' || game.screen === 'pause';
  if (inWorld || game.screen === 'over' || game.screen === 'victory') {
    drawPickups(ctx, game, time);
    for (const e of game.enemies) drawEnemy(ctx, e, time);
    drawBullets(ctx, game);
    drawPlayer(ctx, game, time);
    game.particles.draw(ctx);
  }
  ctx.restore();

  if (game.screen === 'play' || game.screen === 'pause') {
    drawHud(ctx, game);
    drawBanner(ctx, game);
    drawAnnounce(ctx, game);
    if (game.screen === 'play') drawCrosshair(ctx, input);
  }

  // Low-hull heartbeat vignette.
  if (game.screen === 'play' && game.player.alive && game.player.hp / game.player.maxHp < 0.3) {
    const a = 0.16 + 0.12 * Math.sin(time * 6);
    const vg = ctx.createRadialGradient(
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.42,
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.75,
    );
    vg.addColorStop(0, 'rgba(255, 45, 85, 0)');
    vg.addColorStop(1, `rgba(255, 45, 85, ${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  if (game.screen === 'title') drawTitle(ctx, game, input, time);
  else if (game.screen === 'upgrade') drawUpgrade(ctx, game, input);
  else if (game.screen === 'pause') drawPause(ctx, game, input);
  else if (game.screen === 'over') drawOver(ctx, game, input, time);
  else if (game.screen === 'victory') drawVictory(ctx, game, input, time);

  // Mute hint, always visible.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(143, 134, 184, 0.75)';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText(game.audioMuted ? 'SOUND OFF  [M]' : 'SOUND ON  [M]', 24, ARENA.height - 40);
}
