// The world: all game state and the one step that advances it. It wires the city, traffic,
// pedestrians, player, police, wanted level, combat, missions, collectibles and the garage
// shop together, and exposes what the HUD and minimap need to draw.
import * as THREE from 'three';
import { CITY, PLAYER, START_MONEY, START_POS, WEAPONS } from './config.js';
import { buildCity, collideBuildings } from './city.js';
import { createVehicle, createVehicleMesh, driveVehicle, syncVehicleMesh } from './vehicles.js';
import { createTraffic, updateTraffic, nearestTrafficCar, removeTrafficCar } from './traffic.js';
import { createPedestrians, updatePedestrians, scarePedestrians } from './pedestrians.js';
import { createPlayer, walkPlayer, jumpPlayer, hurtPlayer, healPlayer } from './player.js';
import { createWanted, addCrime, updateWantedLevel, clearWanted } from './wanted.js';
import { createPolice, startPolicePursuit, stopPolicePursuit, updatePolice, policePositions } from './police.js';
import { createCombat, spawnEnemies, clearEnemies, shootWeapon, punchAttack, updateEnemies, enemiesAlive, updateCombatTimers } from './combat.js';
import { createParticles } from './particles.js';
import { createMissions, startMission, advanceStep, completeMission, updateMissionStep, currentStep, stepWaypoint, missionTitle, missionDialog, missionDoneLine, GARAGE, PIER, STASH, LIGHTHOUSE, TOWER, PACKAGE_SPOTS, missionCount } from './missions.js';
import { INTRO_LINES, CHARACTERS } from './story.js';

export const EVENT_WASTED = 1;
export const EVENT_BUSTED = 2;
export const EVENT_MISSION_DONE = 4;
export const EVENT_STORY_DONE = 8;

function makePackageMesh(scene, x, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: 0xffd23f }));
  mesh.position.set(x, 0.8, z);
  scene.add(mesh);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.35 }));
  glow.position.set(x, 0.8, z);
  scene.add(glow);
  return { mesh, glow, x, z, taken: false };
}

export function createWorld(scene, random) {
  const city = buildCity(scene, random);
  const traffic = createTraffic(scene, random, 16);
  const crowd = createPedestrians(scene, random, 26);
  const player = createPlayer(scene, START_POS.x, START_POS.z);
  const wanted = createWanted();
  const police = createPolice(scene);
  const combat = createCombat(scene);
  const particles = createParticles(scene);
  const missions = createMissions();

  // Parked cars the player can steal, scattered along roads.
  const parked = [];
  const parkedTypes = ['sedan', 'sport', 'van', 'pickup', 'sedan', 'pickup', 'bike', 'sedan'];
  parkedTypes.forEach((type, i) => {
    const road = CITY.roadAt(1 + (i % 7));
    const pos = -200 + i * 55;
    // Parked along a north-south road: heading 0 drives along the road, not into buildings.
    const car = createVehicle(type, road + 5, pos, 0);
    car.mesh = createVehicleMesh(type);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading - Math.PI / 2;
    scene.add(car.mesh);
    parked.push(car);
  });

  const packages = PACKAGE_SPOTS.map((s) => makePackageMesh(scene, s.x, s.z));

  const state = {
    scene, random, city, traffic, crowd, player, wanted, police, combat, particles, missions, parked, packages,
    money: START_MONEY, weapon: 'fists', ammo: { pistol: 24, smg: 64 },
    ownedCars: [], weaponsOwned: ['fists'], raceWins: 0, day: 1,
    clock: 18 * 3600 + 24 * 60, elapsed: 0, damageFlash: 0,
    dialog: null, shopOpen: false, raceRival: null, cashBags: [],
    nextMissionDelay: -1, healthRegen: 0, radioTimer: 20, radioIndex: 0,
  };
  return state;
}

function showDialog(state, lines) {
  state.dialog = { lines, index: 0 };
}

export function dialogActive(state) {
  return state.dialog !== null;
}

export function currentDialogLine(state) {
  if (!state.dialog) return null;
  return state.dialog.lines[state.dialog.index];
}

export function advanceDialog(state) {
  if (!state.dialog) return false;
  state.dialog.index += 1;
  if (state.dialog.index >= state.dialog.lines.length) {
    state.dialog = null;
    return true;
  }
  return false;
}

export function startNewGame(state) {
  state.money = START_MONEY;
  state.weapon = 'fists';
  state.ammo = { pistol: 24, smg: 64 };
  state.ownedCars = [];
  state.weaponsOwned = ['fists'];
  state.raceWins = 0;
  state.day = 1;
  state.clock = 18 * 3600 + 24 * 60;
  state.player.health = PLAYER.maxHealth;
  state.player.x = START_POS.x;
  state.player.z = START_POS.z;
  state.player.heading = Math.PI;
  clearWanted(state.wanted);
  stopPolicePursuit(state.police);
  clearEnemies(state.combat);
  state.missions.index = 0;
  state.missions.finished = false;
  state.nextMissionDelay = -1;
  startMission(state.missions);
  showDialog(state, INTRO_LINES);
  setupStep(state, currentStep(state.missions));
}

export function applySave(state, save) {
  state.money = save.money ?? START_MONEY;
  state.missions.index = Math.min(save.missionIndex ?? 0, missionCount() - 1);
  state.missions.finished = (save.missionIndex ?? 0) >= missionCount();
  state.weaponsOwned = save.weapons ?? ['fists'];
  state.ammo = save.ammo ?? { pistol: 24, smg: 64 };
  state.ownedCars = [];
  for (const type of save.ownedCars ?? []) {
    const car = createVehicle(type, GARAGE.x, GARAGE.z + 14, 0);
    car.mesh = createVehicleMesh(type);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading - Math.PI / 2;
    car.owned = true;
    state.scene.add(car.mesh);
    state.parked.push(car);
    state.ownedCars.push(car);
  }
  state.raceWins = save.raceWins ?? 0;
  state.day = save.day ?? 1;
  state.player.x = save.player?.x ?? START_POS.x;
  state.player.z = save.player?.z ?? START_POS.z;
  state.player.heading = save.player?.heading ?? Math.PI;
  state.player.health = PLAYER.maxHealth;
  clearWanted(state.wanted);
  if (!state.missions.finished) {
    startMission(state.missions);
    setupStep(state, currentStep(state.missions));
  }
}

export function missionsDoneCount(state) {
  return state.missions.finished ? missionCount() : state.missions.index;
}

export function packagesFound(state) {
  return state.packages.filter((p) => p.taken).length;
}

// Spawn what the current mission step needs: the delivery van, Vulture enemies, cash bags,
// or the race rival.
export function setupStep(state, step) {
  if (!step) return;
  clearEnemies(state.combat);
  for (const bag of state.cashBags) { state.scene.remove(bag.mesh); state.scene.remove(bag.glow); }
  state.cashBags = [];
  if (state.raceRival) { state.scene.remove(state.raceRival.mesh); state.raceRival = null; }
  if (step.kind === 'escape') {
    state.wanted.heat = 45;
    state.wanted.level = 2;
  }
  if (step.kind === 'kill') {
    const spots = [];
    for (let i = 0; i < step.count; i += 1) {
      // Keep enemies on the road around the fight spot, never inside a building.
      spots.push({ x: step.at.x + (state.random() - 0.5) * 11, z: step.at.z + (state.random() - 0.5) * 11 });
    }
    spawnEnemies(state.combat, spots, 'vulture');
  }
  if (state.missions.index === 1 && step.kind === 'enterCar') {
    const van = createVehicle('van', PIER.x + 6, PIER.z - 6, Math.PI);
    van.mesh = createVehicleMesh('van', 0xffffff);
    van.mesh.position.set(van.x, 0, van.z);
    van.mesh.rotation.y = van.heading - Math.PI / 2;
    state.scene.add(van.mesh);
    state.parked.push(van);
  }
  if (step.kind === 'collect') {
    for (let i = 0; i < step.count; i += 1) {
      const bag = makePackageMesh(state.scene, step.at.x + (i - 1) * 8, step.at.z + 6);
      state.cashBags.push(bag);
    }
  }
  if (step.kind === 'race') {
    const rival = createVehicle('sport', TOWER.x + 4, TOWER.z + 4, 0, 0x111111);
    rival.mesh = createVehicleMesh('sport', 0x111111);
    rival.mesh.position.set(rival.x, 0, rival.z);
    state.scene.add(rival.mesh);
    state.raceRival = rival;
  }
}

// Steal or enter the nearest car. Traffic cars and parked cars are stolen (a crime); cars the
// player bought are entered free. Returns the car or null.
export function stealNearestCar(state) {
  const p = state.player;
  let best = null;
  let bestD = 5;
  let fromTraffic = false;
  for (const car of state.parked) {
    const d = Math.hypot(car.x - p.x, car.z - p.z);
    if (d < bestD) { bestD = d; best = car; fromTraffic = false; }
  }
  const near = nearestTrafficCar(state.traffic, p.x, p.z, bestD);
  if (near) { best = near; fromTraffic = true; }
  if (!best) return null;
  if (fromTraffic) removeTrafficCar(state.traffic, best);
  else {
    const i = state.parked.indexOf(best);
    if (i >= 0) state.parked.splice(i, 1);
  }
  const owned = state.ownedCars.includes(best);
  best.parked = false;
  p.inCar = best;
  p.mesh.visible = false;
  if (!owned) {
    addCrime(state.wanted, 12, 'car theft');
  }
  return best;
}

export function exitCar(state) {
  const car = state.player.inCar;
  if (!car) return;
  state.player.inCar = null;
  state.player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
  state.player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
  state.player.heading = car.heading;
  state.player.mesh.visible = true;
  state.player.mesh.position.set(state.player.x, 0, state.player.z);
  car.speed = 0;
  state.parked.push(car);
}

export function nearestCarPrompt(state) {
  const p = state.player;
  if (p.inCar) return 'E — EXIT CAR';
  for (const car of state.parked) {
    if (Math.hypot(car.x - p.x, car.z - p.z) < 5) {
      return state.ownedCars.includes(car) ? 'E — ENTER YOUR CAR' : 'E — STEAL CAR';
    }
  }
  const near = nearestTrafficCar(state.traffic, p.x, p.z, 5);
  if (near) return 'E — STEAL CAR';
  return null;
}

export function garagePrompt(state) {
  const p = state.player;
  if (!p.inCar && Math.hypot(p.x - GARAGE.x, p.z - GARAGE.z) < 12) return true;
  return false;
}

export const SHOP_ITEMS = [
  { key: 'pistol', name: 'Pistol', price: 450, kind: 'weapon' },
  { key: 'smg', name: 'SMG', price: 1800, kind: 'weapon' },
  { key: 'sport', name: 'Vortex GT (parked at garage)', price: 8500, kind: 'car' },
  { key: 'pickup', name: 'Dune Pickup (parked at garage)', price: 2400, kind: 'car' },
];

export function buyShopItem(state, index) {
  const item = SHOP_ITEMS[index];
  if (!item || state.money < item.price) return false;
  state.money -= item.price;
  if (item.kind === 'weapon') {
    if (!state.weaponsOwned.includes(item.key)) state.weaponsOwned.push(item.key);
    state.ammo[item.key] = (state.ammo[item.key] ?? 0) + WEAPONS[item.key].ammo * 2;
  } else {
    const car = createVehicle(item.key, GARAGE.x, GARAGE.z + 14, 0);
    car.mesh = createVehicleMesh(item.key);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading - Math.PI / 2;
    car.owned = true;
    state.scene.add(car.mesh);
    state.parked.push(car);
    state.ownedCars.push(car);
  }
  return true;
}

// One fixed step of the whole game. Returns event flags (wasted / busted / mission done).
export function stepWorld(state, dt, input, camera, audio, hud) {
  let events = 0;
  const p = state.player;
  state.elapsed += dt;
  state.clock += dt * 60;
  if (state.clock >= 24 * 3600) { state.clock -= 24 * 3600; state.day += 1; }
  if (state.damageFlash > 0) state.damageFlash -= dt * 2;
  state.healthRegen += dt;
  if (state.healthRegen > 5 && p.health > 0 && p.health < PLAYER.maxHealth && state.wanted.level === 0) {
    healPlayer(p, 4);
    state.healthRegen = 0;
  }

  let actions = input.takeActions();
  const mouse = input.takeMouse();
  // Dialog eats the E key until it is done.
  if (dialogActive(state)) {
    if (actions & 1) {
      const done = advanceDialog(state);
      if (done) hud.hideDialog();
    }
    return events;
  }
  if (state.shopOpen) {
    const key = input.takeWeaponKey();
    if (key >= 1 && key <= SHOP_ITEMS.length) {
      if (buyShopItem(state, key - 1)) { hud.toast(`${SHOP_ITEMS[key - 1].name} bought!`, 2); audio.pickup(); }
      else hud.toast('Not enough cash.', 2);
    }
    if (actions & 1) { state.shopOpen = false; hud.hideDialog(); }
    return events;
  }

  // --- Player / driving ---
  if (p.inCar) {
    const car = p.inCar;
    const move = input.move();
    const moved = driveVehicle(car, dt, move.f, -move.s, (actions & 4) !== 0);
    const fixed = collideBuildings(state.city.colliders, car.x, car.z, 2.2);
    if (fixed.hit) {
      if (Math.abs(car.speed) > 12) { audio.crash(); state.particles.burst(car.x, 1, car.z, 14, 0xffaa33, 4, 0.8); }
      car.speed *= 0.55;
      car.x = fixed.x;
      car.z = fixed.z;
    }
    car.x = Math.max(-310, Math.min(310, car.x));
    car.z = Math.max(-310, Math.min(460, car.z));
    syncVehicleMesh(car);
    if (moved > 0.05 && Math.random() < dt * 6) state.particles.dust(car.x - Math.sin(car.heading) * 2, 0.3, car.z - Math.cos(car.heading) * 2);
    if ((actions & 1) && !dialogActive(state)) { exitCar(state); actions &= ~1; }
    audio.setEngine(Math.abs(car.speed) / car.def.top, true);
  } else {
    const move = input.move();
    walkPlayer(p, dt, move, camera.yaw, state.city.colliders);
    if (actions & 4) jumpPlayer(p);
    if (actions & 8) {
      const hit = punchAttack(state.combat, p, state.crowd.peds);
      if (hit) { audio.punch(); state.particles.burst(p.x + Math.sin(p.heading) * 1.5, 1.4, p.z + Math.cos(p.heading) * 1.5, 6, 0xffe14d, 3, 0.4); }
      p.punchTimer = 0.3;
    }
    audio.setEngine(0, false);
  }
  if (p.punchTimer > 0) p.punchTimer -= dt;

  // --- Interact: steal / enter car, garage shop, mission marker ---
  if (actions & 1) {
    if (!p.inCar) {
      const car = stealNearestCar(state);
      if (car) {
        audio.pickup();
        hud.toast(`Stole the ${car.def.name}!`, 2);
        hud.announce(`Stole the ${car.def.name}.`);
      } else if (garagePrompt(state)) {
        state.shopOpen = true;
        const lines = SHOP_ITEMS.map((it, i) => `${i + 1}. ${it.name} — $${it.price.toLocaleString('en-US')}`);
        hud.showDialog('MARA\'S GARAGE — SHOP', `Cash $${state.money.toLocaleString('en-US')}\n${lines.join('\n')}\nPress 1-4 to buy, E to leave.`);
      }
    }
  }

  // --- Weapons ---
  const wkey = input.takeWeaponKey();
  if (wkey === 1) state.weapon = 'fists';
  else if (wkey === 2 && state.weaponsOwned.includes('pistol')) state.weapon = 'pistol';
  else if (wkey === 3 && state.weaponsOwned.includes('smg')) state.weapon = 'smg';
  if (actions & 16) {
    if (state.weapon !== 'fists') state.ammo[state.weapon] = WEAPONS[state.weapon].ammo;
  }
  updateCombatTimers(state.combat, dt);
  if (input.firing() && state.weapon !== 'fists' && !p.inCar) {
    if ((state.ammo[state.weapon] ?? 0) > 0 && state.combat.cooldown <= 0) {
      state.ammo[state.weapon] -= 1;
      audio.shoot();
      const hit = shootWeapon(state.combat, camera.threeCamera, state.weapon, p, (enemy, point) => {
        state.particles.burst(point.x, point.y, point.z, 10, 0xff5533, 4, 0.5);
      });
      scarePedestrians(state.crowd.peds, p.x, p.z, 25);
      if (state.police.cars.length > 0 || state.wanted.level > 0) addCrime(state.wanted, 6, 'shooting');
      if (hit && !hit.alive) hud.toast('Target down.', 1.5);
    }
  }

  // --- Traffic, pedestrians, particles ---
  updateTraffic(state.traffic, dt);
  updatePedestrians(state.crowd, dt, p.inCar ? p.inCar : p);
  state.particles.update(dt);

  // --- Wanted & police ---
  const visible = state.police.cars.some((c) => Math.hypot(c.x - (p.inCar ? p.inCar.x : p.x), c.z - (p.inCar ? p.inCar.z : p.z)) < 70);
  updateWantedLevel(state.wanted, dt, visible);
  if (state.wanted.level > 0) {
    startPolicePursuit(state.police, state.wanted.level, p.inCar ? p.inCar.x : p.x, p.inCar ? p.inCar.z : p.z, state.random);
    audio.setSiren(true);
  } else {
    stopPolicePursuit(state.police);
    audio.setSiren(false);
  }
  if (state.police.cars.length > 0) {
    const bust = updatePolice(state.police, dt, state.wanted.level, p, p.inCar);
    if (bust) { events |= EVENT_BUSTED; return events; }
  }

  // --- Enemies ---
  const damage = updateEnemies(state.combat, dt, p, p.inCar);
  if (damage > 0) {
    if (hurtPlayer(p, damage)) { events |= EVENT_WASTED; return events; }
    state.damageFlash = 1;
  }

  // --- Race rival ---
  if (state.raceRival) {
    const rival = state.raceRival;
    const dx = PIER.x - rival.x;
    const dz = PIER.z - rival.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 12) {
      hud.toast('Kade Voss won the race!', 3);
      state.missions.active = false;
      startMission(state.missions);
      setupStep(state, currentStep(state.missions));
      state.scene.remove(rival.mesh);
      state.raceRival = null;
    } else {
      rival.heading = Math.atan2(dx, dz);
      rival.x += Math.sin(rival.heading) * 30 * dt;
      rival.z += Math.cos(rival.heading) * 30 * dt;
      syncVehicleMesh(rival);
    }
  }

  // --- Missions ---
  if (state.missions.active) {
    const ctx = {
      x: p.inCar ? p.inCar.x : p.x,
      z: p.inCar ? p.inCar.z : p.z,
      inCar: !!p.inCar,
      carType: p.inCar ? p.inCar.type : null,
      wanted: state.wanted.level,
      enemiesLeft: enemiesAlive(state.combat),
      time: state.missions.timer,
    };
    const result = updateMissionStep(state.missions, ctx, dt);
    if (result === 'step-done') {
      const next = advanceStep(state.missions);
      if (next === 'mission-done') {
        const reward = completeMission(state.missions);
        state.money += reward;
        audio.missionDone();
        hud.toast(`MISSION COMPLETE — +$${reward.toLocaleString('en-US')}`, 3);
        hud.announce(`Mission complete. Earned $${reward}.`);
        showDialog(state, [{ who: 'mara', text: missionDoneLine(state.missions.index - 1 < 0 ? 0 : state.missions.index - 1) }]);
        events |= EVENT_MISSION_DONE;
        if (state.missions.finished) events |= EVENT_STORY_DONE;
        else {
          state.nextMissionDelay = 2.5;
        }
      } else {
        setupStep(state, next);
        hud.toast(`New objective: ${next.label}`, 3);
      }
    } else if (result === 'failed') {
      hud.toast('Mission failed — try again.', 3);
      startMission(state.missions);
      setupStep(state, currentStep(state.missions));
    }
  } else if (!state.missions.finished) {
    state.nextMissionDelay -= dt;
    if (state.nextMissionDelay <= 0 && state.nextMissionDelay > -1) {
      state.nextMissionDelay = -1;
      startMission(state.missions);
      setupStep(state, currentStep(state.missions));
      showDialog(state, missionDialog(state.missions.index));
    }
  }

  // --- Collectibles: hidden packages and cash bags ---
  for (const pkg of state.packages) {
    if (pkg.taken) continue;
    pkg.mesh.rotation.y += dt * 2;
    pkg.glow.material.opacity = 0.25 + Math.sin(state.elapsed * 3) * 0.1;
    if (Math.hypot(p.x - pkg.x, p.z - pkg.z) < 2.5) {
      pkg.taken = true;
      pkg.mesh.visible = false;
      pkg.glow.visible = false;
      state.money += 150;
      audio.pickup();
      hud.toast('Hidden package found! +$150', 2);
    }
  }
  for (const bag of state.cashBags) {
    if (bag.taken) continue;
    bag.mesh.rotation.y += dt * 2;
    if (Math.hypot(p.x - bag.x, p.z - bag.z) < 2.5) {
      bag.taken = true;
      bag.mesh.visible = false;
      bag.glow.visible = false;
      state.missions.collected += 1;
      state.money += 200;
      audio.pickup();
      hud.toast('Cash bag grabbed! +$200', 2);
    }
  }

  // --- Radio flavour ---
  state.radioTimer -= dt;
  if (state.radioTimer <= 0) {
    state.radioTimer = 45;
    state.radioIndex = (state.radioIndex + 1) % 4;
  }

  return events;
}

export function currentWaypoint(state) {
  if (!state.missions.active) return null;
  return stepWaypoint(state.missions);
}

export function minimapState(state) {
  return {
    player: { x: state.player.x, z: state.player.z, heading: state.player.inCar ? state.player.inCar.heading : state.player.heading },
    police: policePositions(state.police),
    waypoint: currentWaypoint(state),
    packages: state.packages,
    enemies: state.combat.enemies,
  };
}
