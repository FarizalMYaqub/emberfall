# emberfall

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/FarizalMYaqub/emberfall/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/FarizalMYaqub/emberfall/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Emberfall is a neon arena survival game: pilot a lone ember-ship through endless waves of a growing swarm, dash through bullets, collect embers, and choose upgrades between waves — slay The Maw on wave 10 to win.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is plain static files under `game/`, and all sound is synthesized live with WebAudio.

## How to play

- **Move** — WASD / arrow keys
- **Aim + fire** — mouse, hold left click
- **Dash** — Space (brief invulnerability, use it to cross bullets)
- **Pause / mute** — P / M

Survive 10 waves. Every 5th wave brings **The Maw**, a boss that fires radial bursts and summons motes. Clearing a wave offers a choice of 3 upgrades (fire rate, multishot, piercing rounds, dash cooldown, hull, magnet, crits and more). Kills build a combo multiplier up to ×8; embers dropped by enemies are worth score. Die and the run ends — best score is kept locally.

## Layout

- `game/index.html` — the page; `game/src/` holds the game, one file per job: `main.js` (loop + screens), `world.js` (simulation), `render.js` (drawing), `enemies.js` (roster + AI + boss), `upgrades.js`, `audio.js` (synth SFX + music), `particles.js`, `input.js`, `config.js`, `random.js`, `shots.js` (screenshot scenes via `?shot=title|play|upgrade|over|victory`).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — 4 screenshots of the game itself: title, boss fight, upgrade choice, game over.

---

<sub>Entered on [make.fun](https://make.fun/?ref=qk9k9vgs&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
