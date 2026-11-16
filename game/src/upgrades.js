// Between-wave upgrades: rolling three distinct cards and applying the pick.

import { UPGRADES } from './config.js';

/** Roll three distinct upgrades the player has not maxed out. */
export function rollUpgrades(rng, taken) {
  const pool = UPGRADES.filter((u) => {
    // Twin Barrels caps at 5 projectiles; Piercing at 4.
    if (u.id === 'twin' && taken.filter((t) => t === 'twin').length >= 4) return false;
    if (u.id === 'pierce' && taken.filter((t) => t === 'pierce').length >= 3) return false;
    return true;
  });
  const picks = [];
  const bag = [...pool];
  while (picks.length < 3 && bag.length > 0) {
    const i = Math.floor(rng() * bag.length);
    picks.push(bag.splice(i, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(player, upgrade) {
  upgrade.apply(player);
}
