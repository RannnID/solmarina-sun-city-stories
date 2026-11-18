// The screenshot scenes behind ?shot=chase|walk|mission|city. Each stages a real game state
// from the live rules — a police chase, an on-foot steal, an active mission, the skyline —
// then drives it forward a fixed number of steps with a scripted input, so the same seed
// always gives the same frame. No mockups: every pixel comes from the game itself.
import { STEP } from './config.js';
import { setupStep } from './world.js';
import { currentStep, startMission } from './missions.js';
import { createVehicle, createVehicleMesh, syncVehicleMesh } from './vehicles.js';
import { addCrime } from './wanted.js';
import { startPolicePursuit } from './police.js';
import { CHARACTERS } from './story.js';

const SCRIPTED_INPUT = {
  move() { return { f: 1, s: 0, run: false }; },
  takeActions() { return 0; },
  takeMouse() { return { dx: 0, dy: 0 }; },
  firing() { return false; },
  takeWeaponKey() { return 0; },
};

const IDLE_INPUT = {
  move() { return { f: 0, s: 0, run: false }; },
  takeActions() { return 0; },
  takeMouse() { return { dx: 0, dy: 0 }; },
  firing() { return false; },
  takeWeaponKey() { return 0; },
};

function putPlayerInCar(state, type, x, z, heading) {
  const car = createVehicle(type, x, z, heading);
  car.mesh = createVehicleMesh(type);
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading - Math.PI / 2;
  state.scene.add(car.mesh);
  state.player.inCar = car;
  state.player.mesh.visible = false;
  car.parked = false;
  return car;
}

export function stageShot(name, world, camera, audio, hud, stepWorldFn) {
  const state = world;
  if (name === 'chase') {
    state.money = 12500;
    state.weapon = 'pistol';
    state.weaponsOwned = ['fists', 'pistol'];
    state.ammo.pistol = 9;
    state.missions.index = 2;
    startMission(state.missions);
    setupStep(state, currentStep(state.missions));
    const car = putPlayerInCar(state, 'sport', 0, 90, 0);
    car.speed = 26;
    addCrime(state.wanted, 55, 'chase');
    startPolicePursuit(state.police, 3, car.x, car.z, state.random);
    // Two police cars right behind the player, sirens on.
    state.police.cars[0].x = -4; state.police.cars[0].z = 112; state.police.cars[0].heading = 0; state.police.cars[0].speed = 30;
    if (state.police.cars[1]) { state.police.cars[1].x = 5; state.police.cars[1].z = 116; state.police.cars[1].heading = 0; state.police.cars[1].speed = 29; }
    camera.setYaw(Math.PI);
    for (let i = 0; i < 150; i += 1) stepWorldFn(state, STEP, SCRIPTED_INPUT, camera, audio, hud);
    // Park both patrol cars just behind the player's car so the chase reads in one frame.
    const pc = state.player.inCar;
    if (state.police.cars[0]) {
      state.police.cars[0].x = pc.x - 4; state.police.cars[0].z = pc.z - 11;
      state.police.cars[0].heading = pc.heading; state.police.cars[0].speed = pc.speed * 0.9;
      syncVehicleMesh(state.police.cars[0]);
    }
    if (state.police.cars[1]) {
      state.police.cars[1].x = pc.x + 6; state.police.cars[1].z = pc.z - 6;
      state.police.cars[1].heading = pc.heading; state.police.cars[1].speed = pc.speed * 0.85;
      syncVehicleMesh(state.police.cars[1]);
    }
    return { mode: 'chase', dialog: null };
  }
  if (name === 'walk') {
    state.money = 3250;
    state.weapon = 'pistol';
    state.weaponsOwned = ['fists', 'pistol'];
    state.ammo.pistol = 12;
    state.player.x = 9;
    state.player.z = 118;
    state.player.heading = Math.PI / 2;
    state.player.mesh.position.set(9, 0, 118);
    // A parked sedan right beside the player, in frame, and three pedestrians nearby.
    const near = createVehicle('sedan', 12, 115, Math.PI / 2, 0x2a9d8f);
    near.mesh = createVehicleMesh('sedan', 0x2a9d8f);
    near.mesh.position.set(near.x, 0, near.z);
    near.mesh.rotation.y = near.heading - Math.PI / 2;
    state.scene.add(near.mesh);
    state.parked.push(near);
    const pedSpots = [[16, 108], [2, 126], [20, 122]];
    pedSpots.forEach(([x, z], i) => {
      const ped = state.crowd.peds[i];
      if (ped) { ped.x = x; ped.z = z; ped.mesh.position.set(x, 0, z); }
    });
    state.missions.index = 0;
    startMission(state.missions);
    setupStep(state, currentStep(state.missions));
    camera.setYaw(Math.PI * 0.75);
    for (let i = 0; i < 90; i += 1) stepWorldFn(state, STEP, IDLE_INPUT, camera, audio, hud);
    return { mode: 'walk', prompt: 'E — STEAL CAR' };
  }
  if (name === 'mission') {
    state.money = 8400;
    state.weapon = 'smg';
    state.weaponsOwned = ['fists', 'pistol', 'smg'];
    state.ammo.smg = 28;
    state.missions.index = 4;
    startMission(state.missions);
    const step = currentStep(state.missions);
    setupStep(state, step);
    // Stand on the road at the Marina Point intersection, facing the stash and the Vultures.
    state.player.x = 232;
    state.player.z = 222;
    state.player.heading = Math.PI * 0.25;
    state.player.mesh.position.set(232, 0, 222);
    // Camera northwest of the player, looking southeast at the stash and the enemies.
    camera.setYaw(Math.PI * 0.25);
    for (let i = 0; i < 60; i += 1) stepWorldFn(state, STEP, IDLE_INPUT, camera, audio, hud);
    return {
      mode: 'mission',
      dialog: { name: CHARACTERS.kade.name, text: 'You took my van, Vale. Now you take my money? Come and try, little driver.' },
    };
  }
  // city: aerial skyline view of Solmarina, tower and ocean.
  state.money = 250;
  state.player.x = 0;
  state.player.z = 120;
  state.player.mesh.position.set(0, 0, 120);
  state.missions.index = 0;
  startMission(state.missions);
  setupStep(state, currentStep(state.missions));
  for (let i = 0; i < 60; i += 1) stepWorldFn(state, STEP, IDLE_INPUT, camera, audio, hud);
  return { mode: 'city' };
}
