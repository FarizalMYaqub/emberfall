// EMBERFALL — bootstrap, main loop and screen routing.
// The simulation lives in world.js, the drawing in render.js; this file only
// connects input, audio and the browser to them.

import { ARENA } from './config.js';
import { mulberry32 } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createParticles } from './particles.js';
import { createGame } from './world.js';
import { drawGame } from './render.js';
import { stageShot, autopilot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = ARENA.width;
canvas.height = ARENA.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 20261116);

const audio = createAudio();
const input = createInput(canvas);
const particles = createParticles();
const rng = mulberry32(seed);
const game = createGame(rng, audio, particles);
game.particles = particles;
game.audioMuted = false;

const statusEl = document.getElementById('status');
function announceStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// Screenshot mode: stage a scene from the real simulation, then (for the play
// scene) keep the autopilot driving so the capture stays alive.
let keepAutopilot = false;
if (shotName) {
  keepAutopilot = stageShot(shotName, game, input);
  if (shotName === 'play') announceStatus('Emberfall gameplay: wave in progress.');
}

function inside(rect, x, y) {
  return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function handleClick() {
  if (!input.mouseClicked) return;
  const b = game.buttons || {};
  if (game.screen === 'title' && inside(b.start, input.mouseX, input.mouseY)) {
    audio.unlock();
    audio.click();
    game.beginRun();
    announceStatus('Run started. Survive the swarm.');
  } else if (game.screen === 'upgrade') {
    for (let i = 0; i < 3; i += 1) {
      if (inside(b[`upgrade${i}`], input.mouseX, input.mouseY)) {
        audio.click();
        game.chooseUpgrade(i);
        break;
      }
    }
  } else if (game.screen === 'pause' && inside(b.resume, input.mouseX, input.mouseY)) {
    audio.click();
    game.screen = 'play';
  } else if (game.screen === 'over' && inside(b.restart, input.mouseX, input.mouseY)) {
    audio.click();
    game.beginRun();
  } else if (game.screen === 'victory') {
    if (inside(b.continue, input.mouseX, input.mouseY)) {
      audio.click();
      game.endless = true;
      game.screen = 'play';
      game.startWave(game.wave + 1);
      announceStatus('Endless mode: the swarm never ends.');
    } else if (inside(b.restart, input.mouseX, input.mouseY)) {
      audio.click();
      game.beginRun();
    }
  }
}

function handleKeys() {
  if (input.wasPressed('Enter')) {
    if (game.screen === 'title') {
      audio.unlock();
      game.beginRun();
    } else if (game.screen === 'over' || game.screen === 'victory') {
      game.beginRun();
    }
  }
  if (input.wasPressed('KeyR')) {
    if (game.screen === 'over' || game.screen === 'victory' || game.screen === 'pause') {
      game.beginRun();
    }
  }
  if (input.wasPressed('KeyM')) {
    game.audioMuted = audio.toggleMute();
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    if (game.screen === 'play') {
      game.screen = 'pause';
      announceStatus('Paused.');
    } else if (game.screen === 'pause') {
      game.screen = 'play';
    }
  }
  if (game.screen === 'upgrade') {
    if (input.wasPressed('Digit1')) game.chooseUpgrade(0);
    if (input.wasPressed('Digit2')) game.chooseUpgrade(1);
    if (input.wasPressed('Digit3')) game.chooseUpgrade(2);
  }
}

let last = performance.now();
let elapsed = 0;

function frame(now) {
  const rawDt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  elapsed += rawDt;

  if (!shotName) input.poll();
  handleKeys();
  handleClick();

  if (game.screen === 'play') {
    if (keepAutopilot) autopilot(game, input);
    game.updatePlay(rawDt, input);
  } else if (game.screen === 'over' || game.screen === 'victory') {
    particles.update(rawDt);
    if (game.shake > 0) game.shake = Math.max(0, game.shake - rawDt * 26);
  } else if (game.screen === 'upgrade' || game.screen === 'pause') {
    particles.update(rawDt);
  }

  ctx.clearRect(0, 0, ARENA.width, ARENA.height);
  drawGame(ctx, game, input, elapsed);
  input.endFrame();
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.screen === 'play') game.screen = 'pause';
});

window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

// Exposed for play-testing and debugging from the console.
window.__emberfall = game;

requestAnimationFrame(frame);
