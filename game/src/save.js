// Save and load through localStorage: money, mission progress, owned weapons and cars,
// collectibles found, and the player's position. A corrupt or missing save starts fresh.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      missionIndex: state.missionIndex,
      missionsDone: state.missionsDone,
      weapons: state.weapons,
      ammo: state.ammo,
      ownedCars: state.ownedCars,
      packages: state.packages,
      raceWins: state.raceWins,
      player: { x: state.player.x, z: state.player.z, heading: state.player.heading },
      day: state.day,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

export function hasSave() {
  return loadSave() !== null;
}
