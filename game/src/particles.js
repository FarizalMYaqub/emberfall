// Particles, shockwave rings and floating score text — the game's juice.
// Everything here is cosmetic: it never changes the simulation.

export function createParticles() {
  const sparks = [];
  const rings = [];
  const texts = [];
  const trails = [];

  function burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      sparks.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 3.2,
      });
    }
  }

  function explosion(x, y, color, big) {
    burst(x, y, color, big ? 46 : 22, big ? 420 : 300, big ? 0.9 : 0.6, big ? 4.5 : 3.2);
    burst(x, y, '#ffffff', big ? 10 : 5, big ? 220 : 160, 0.35, 2.4);
    ring(x, y, color, big ? 90 : 52, big ? 3.2 : 2.2);
  }

  function ring(x, y, color, maxRadius, width) {
    rings.push({ x, y, color, radius: 6, maxRadius, width, life: 0.45, maxLife: 0.45 });
  }

  function floatText(x, y, text, color, size) {
    texts.push({ x, y, text, color, size: size || 16, life: 0.9, maxLife: 0.9 });
  }

  function trail(x, y, color, size) {
    trails.push({ x, y, color, size, life: 0.28, maxLife: 0.28 });
  }

  function update(dt) {
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      const d = Math.max(0, 1 - s.drag * dt);
      s.vx *= d;
      s.vy *= d;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const r = rings[i];
      r.life -= dt;
      if (r.life <= 0) { rings.splice(i, 1); continue; }
      const t = 1 - r.life / r.maxLife;
      r.radius = 6 + (r.maxRadius - 6) * (1 - (1 - t) * (1 - t));
    }
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      const t = texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) texts.splice(i, 1);
    }
    for (let i = trails.length - 1; i >= 0; i -= 1) {
      const t = trails[i];
      t.life -= dt;
      if (t.life <= 0) trails.splice(i, 1);
    }
  }

  function draw(ctx) {
    for (const t of trails) {
      const a = t.life / t.maxLife;
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const s of sparks) {
      const a = Math.max(0, s.life / s.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.4, s.size * a), 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(0.5, r.width * a);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    for (const t of texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    sparks.length = 0;
    rings.length = 0;
    texts.length = 0;
    trails.length = 0;
  }

  return { burst, explosion, ring, floatText, trail, update, draw, clear,
    get count() { return sparks.length + rings.length + texts.length; } };
}
