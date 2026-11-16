// EMBERFALL — tuning, palette and upgrade definitions.
// One place for every number the game balances on, so tuning never hides in logic.

export const ARENA = { width: 1280, height: 720, margin: 26 };

export const PALETTE = {
  bg0: '#070312',
  bg1: '#120826',
  bg2: '#1c0b33',
  grid: 'rgba(146, 90, 255, 0.10)',
  ember: '#ff9a3d',
  emberHot: '#ffd166',
  emberCore: '#fff3c4',
  player: '#5df2ff',
  playerCore: '#eafcff',
  hp: '#3dff8e',
  hpLow: '#ff4d6d',
  score: '#ffd166',
  danger: '#ff4d6d',
  muted: '#8f86b8',
  bright: '#f4efff',
};

export const PLAYER = {
  radius: 15,
  speed: 345,
  accel: 2600,
  friction: 6.5,
  maxHp: 100,
  fireInterval: 0.19,
  bulletSpeed: 760,
  bulletDamage: 12,
  bulletRadius: 5,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 2.4,
  dashInvuln: 0.32,
  pickupRadius: 92,
  fireRange: 900,
};

export const COMBO = {
  window: 3.0,
  perStep: 5,
  maxMult: 8,
};

export const WAVES = {
  baseCount: 6,
  perWave: 3,
  hpGrowth: 0.16,
  speedGrowth: 0.022,
  bossWaves: [5, 10],
  victoryWave: 10,
  clearBonus: 250,
  spawnInterval: 0.85,
  spawnIntervalMin: 0.32,
};

// Enemy roster. `weight` is the spawn-table weight once the wave unlocks it.
export const ENEMIES = {
  mote: {
    name: 'Mote',
    radius: 14, hp: 22, speed: 118, damage: 10, score: 50,
    color: '#ff5da2', core: '#ffd7ea', unlock: 1, weight: 10,
    emberDrop: 1,
  },
  stinger: {
    name: 'Stinger',
    radius: 11, hp: 16, speed: 235, damage: 8, score: 80,
    color: '#ffe14d', core: '#fff7c4', unlock: 2, weight: 7,
    emberDrop: 1,
  },
  weaver: {
    name: 'Weaver',
    radius: 17, hp: 34, speed: 82, damage: 12, score: 120,
    color: '#b678ff', core: '#eadcff', unlock: 3, weight: 6,
    emberDrop: 2,
  },
  splitter: {
    name: 'Splitter',
    radius: 22, hp: 46, speed: 88, damage: 14, score: 140,
    color: '#ff8a3d', core: '#ffe3c4', unlock: 4, weight: 5,
    emberDrop: 2,
  },
  bulwark: {
    name: 'Bulwark',
    radius: 30, hp: 150, speed: 52, damage: 22, score: 260,
    color: '#3ddbd9', core: '#d8fffe', unlock: 6, weight: 3,
    emberDrop: 4,
  },
};

export const BOSS = {
  name: 'THE MAW',
  radius: 62, hp: 950, speed: 62, damage: 26, score: 2500,
  color: '#ff2e63', core: '#ffc4d1',
  burstInterval: 2.4,
  summonInterval: 6.0,
  chargeInterval: 8.0,
};

// Between-wave upgrades. `apply` mutates the player; `desc` is shown on the card.
export const UPGRADES = [
  {
    id: 'rapid', name: 'Rapid Trigger', icon: '»»',
    desc: '+22% fire rate. More embers downrange, faster.',
    apply: (p) => { p.fireInterval *= 0.82; },
  },
  {
    id: 'heavy', name: 'Heavy Rounds', icon: '◆',
    desc: '+30% bullet damage. Fewer shots per kill.',
    apply: (p) => { p.bulletDamage *= 1.30; },
  },
  {
    id: 'twin', name: 'Twin Barrels', icon: '⋔',
    desc: '+1 projectile per shot, spread a little wider.',
    apply: (p) => { p.projectiles += 1; },
  },
  {
    id: 'pierce', name: 'Piercing Rounds', icon: '→→',
    desc: 'Bullets punch through +1 enemy each.',
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'swift', name: 'Swift Hull', icon: '≫',
    desc: '+12% move speed. Outrun the swarm.',
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'dash', name: 'Phase Dash', icon: '✦',
    desc: 'Dash recharges 30% faster.',
    apply: (p) => { p.dashCooldown *= 0.70; },
  },
  {
    id: 'hull', name: 'Reinforced Hull', icon: '▣',
    desc: '+25 max hull and repair 25 now.',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'magnet', name: 'Magnet Core', icon: '◎',
    desc: '+70% ember pickup radius. Score drifts to you.',
    apply: (p) => { p.pickupRadius *= 1.70; },
  },
  {
    id: 'crit', name: 'Overdrive Rounds', icon: '✷',
    desc: '15% of shots crit for double damage.',
    apply: (p) => { p.crit += 0.15; },
  },
  {
    id: 'regen', name: 'Nanoweave', icon: '✚',
    desc: 'Regenerate 1 hull every 3 seconds.',
    apply: (p) => { p.regen += 1 / 3; },
  },
  {
    id: 'siphon', name: 'Ember Siphon', icon: '♺',
    desc: 'Every 10th kill repairs 2 hull.',
    apply: (p) => { p.siphon += 1; },
  },
  {
    id: 'velocity', name: 'Railgun Coils', icon: '⇢',
    desc: '+25% bullet speed and +15% bullet damage.',
    apply: (p) => { p.bulletSpeed *= 1.25; p.bulletDamage *= 1.15; },
  },
];
