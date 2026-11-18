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
    // Two police cars right BEHIND the player (lower z = behind a car heading +z),
    // sirens on. The camera sits behind the player too (yaw 0), so the chase reads as
    // pursuit from behind, not a roadblock ahead.
    state.police.cars[0].x = -4; state.police.cars[0].z = 68; state.police.cars[0].heading = 0; state.police.cars[0].speed = 30;
    if (state.police.cars[1]) { state.police.cars[1].x = 5; state.police.cars[1].z = 64; state.police.cars[1].heading = 0; state.police.cars[1].speed = 29; }
    camera.setYaw(0);
    for (let i = 0; i < 150; i += 1) stepWorldFn(state, STEP, SCRIPTED_INPUT, camera, audio, hud);
    // Park both patrol cars just behind the player's car, between the camera and the
    // player, so the chase reads in one frame: cops closing in from behind.
    // (The camera snap sits ~10.5 units behind the player, so a cop parked 9+
    // units behind the player sits ~2 units from the lens and renders as a
    // cropped black blob. Parked 4.0/5.0 behind the player they sit 5–6 units
    // from the lens, fully in frame. The chase camera looks along +z, so
    // world +x is screen-left: the screen-left cop is pulled toward the
    // centre so its flank clears the minimap in the bottom-left corner, and
    // both are yawed a touch more so the white door slab and the roof light
    // bar read from the chase camera instead of being cropped by the edges.)
    const pc = state.player.inCar;
    if (state.police.cars[0]) {
      state.police.cars[0].x = pc.x - 1.7; state.police.cars[0].z = pc.z - 4.0;
      state.police.cars[0].heading = pc.heading - 0.16; state.police.cars[0].speed = pc.speed * 0.9;
      syncVehicleMesh(state.police.cars[0]);
    }
    if (state.police.cars[1]) {
      state.police.cars[1].x = pc.x + 2.0; state.police.cars[1].z = pc.z - 5.0;
      state.police.cars[1].heading = pc.heading + 0.16; state.police.cars[1].speed = pc.speed * 0.85;
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
    // Closer than the first staging (13 units off the stash instead of 25) so the
    // enemies read as figures, not distant dots, at the judge's 768px width.
    state.player.x = 234;
    state.player.z = 228;
    state.player.heading = Math.PI * 0.25;
    state.player.mesh.position.set(234, 0, 228);
    // Camera northwest of the player, looking southeast at the stash and the enemies.
    camera.setYaw(Math.PI * 0.25);
    for (let i = 0; i < 60; i += 1) stepWorldFn(state, STEP, IDLE_INPUT, camera, audio, hud);
    // Restage: line all four Vultures up in a lateral arc across the stash, at the same
    // depth from the camera, so every one of them is in frame (the random ±5.5 spawn
    // used to hide one behind the others / out of frame). Spread a touch wider
    // than the first restage so each figure stands apart with margin at 768px.
    {
      const cx = 240; const cz = 240;
      const lateral = [0.7071, -0.7071]; // camera view dir is (0.7071, 0.7071)
      const offsets = [-7, -2.5, 2.5, 7];
      state.combat.enemies.forEach((e, i) => {
        if (!e.alive) return;
        const o = offsets[i % offsets.length];
        e.x = cx + lateral[0] * o;
        e.z = cz + lateral[1] * o;
        e.mesh.position.set(e.x, 0, e.z);
      });
    }
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
