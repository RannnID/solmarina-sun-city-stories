// Every tuning number and colour for SOLMARINA in one place.
// The city is a 9x9 block grid: roads every 60 units, road width 14, world span about +/-300.
// Ocean and beach sit south of the city (z > 300); the tower district is north.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmarina.save.v1';

export const CITY = {
  blocks: 9, block: 60, road: 14, half: 300,
  roadAt(i) { return (i - 4) * 60; },
  nearestRoad(v) { return Math.round(v / 60) * 60; },
  isRoad(x, z) {
    const rx = Math.abs(x - Math.round(x / 60) * 60);
    const rz = Math.abs(z - Math.round(z / 60) * 60);
    return rx < 8 || rz < 8;
  },
};

export const PLAYER = { walk: 6, run: 10.5, jump: 8.5, radius: 0.7, height: 1.8, maxHealth: 100 };

export const VEHICLE_TYPES = {
  sedan:  { name: 'Solmarina Sedan',   accel: 14, top: 34, brake: 26, grip: 2.6, turn: 1.9, price: 1200, color: 0x3a7bd5, size: [4.4, 1.4, 2.0] },
  sport:  { name: 'Vortex GT',        accel: 22, top: 48, brake: 30, grip: 2.2, turn: 2.4, price: 8500, color: 0xe63946, size: [4.2, 1.1, 1.9] },
  van:    { name: 'Harbor Van',       accel: 10, top: 28, brake: 22, grip: 3.0, turn: 1.6, price: 900,  color: 0xf4f1de, size: [5.0, 2.1, 2.2] },
  pickup: { name: 'Dune Pickup',      accel: 15, top: 36, brake: 24, grip: 2.8, turn: 1.9, price: 2400, color: 0x2a9d8f, size: [4.8, 1.6, 2.1] },
  bike:   { name: 'Coast Runner Bike', accel: 20, top: 44, brake: 28, grip: 1.9, turn: 2.9, price: 3200, color: 0xf4a261, size: [2.2, 1.2, 0.9] },
};

export const WEAPONS = {
  fists:  { name: 'FISTS',   damage: 12, range: 2.2, rate: 0.45, ammo: Infinity, price: 0 },
  pistol: { name: 'PISTOL',  damage: 26, range: 55,  rate: 0.28, ammo: 12, price: 450 },
  smg:    { name: 'SMG',     damage: 15, range: 48,  rate: 0.09, ammo: 32, price: 1800 },
};

export const WANTED = {
  decay: 0.8,
  bustRadius: 3.2,
  maxCops: [0, 2, 3, 4, 6, 8],
  copSpeed: [0, 30, 33, 36, 39, 42],
};

export const MISSION_COUNT = 8;
export const START_MONEY = 250;
export const START_POS = { x: 0, z: 120 };

export const PALETTE = {
  sky: 0xffd9a0, sun: 0xffe3b3, fog: 0xf2b880,
  road: 0x3c3f46, sidewalk: 0xb8a88f, sand: 0xe8cf9e, ocean: 0x2e7fa8,
  grass: 0x7fae5a, building: [0xe8b48a, 0xd98c6a, 0xc9a06a, 0x9fb4c7, 0xe0d0b0, 0xb07a5a],
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
