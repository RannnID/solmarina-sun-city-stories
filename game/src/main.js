// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, the camera follows, and the renderer paints what is there. The game moves between
// four screens: title, play, paused and game over.
//
// ?seed=N fixes the world. ?shot=chase|walk|mission|city (with &seed=N) stages that scene
// instead of running the loop, paints it a few times and sets window.__shotReady.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { createCamera } from './camera.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createScreens, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './screens.js';
import { createWorld, stepWorld, startNewGame, applySave, dialogActive, currentDialogLine, missionsDoneCount, packagesFound, currentWaypoint, minimapState, nearestCarPrompt, garagePrompt, EVENT_WASTED, EVENT_BUSTED, EVENT_STORY_DONE } from './world.js';
import { stageShot } from './shots.js';
import { loadSave, saveGame, hasSave } from './save.js';
import { CHARACTERS } from './story.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const minimapCanvas = document.getElementById('minimap');
const renderer = createRenderer(canvas);
const camera = createCamera(renderer.camera);
camera.threeCamera = renderer.camera;
const world = createWorld(renderer.scene, createRandom(seed));
const audio = createAudio();
const hud = createHud();
const minimap = createMinimap(minimapCanvas);

let screen = SCREEN_TITLE;

function announce(message) {
  status.textContent = message;
}

function saveState() {
  return {
    money: world.money,
    missionIndex: world.missions.index,
    missionsDone: missionsDoneCount(world),
    weapons: world.weaponsOwned,
    ammo: world.ammo,
    ownedCars: world.ownedCars.length,
    packages: packagesFound(world),
    raceWins: world.raceWins,
    player: { x: world.player.x, z: world.player.z, heading: world.player.heading },
    day: world.day,
  };
}

function persist() {
  saveGame({
    money: world.money,
    missionIndex: world.missions.index,
    missionsDone: missionsDoneCount(world),
    weapons: world.weaponsOwned,
    ammo: world.ammo,
    ownedCars: world.ownedCars.map((c) => c.type),
    packages: packagesFound(world),
    raceWins: world.raceWins,
    player: { x: world.player.x, z: world.player.z, heading: world.player.heading },
    day: world.day,
  });
}

const screens = createScreens({
  newGame() {
    audio.unlock();
    startNewGame(world);
    screen = SCREEN_PLAY;
    hud.toast('Mission 1 — THE VAN JOB', 3);
    announce('New game. Mission 1: steal a car and drive to the pier.');
  },
  continueGame() {
    audio.unlock();
    const save = loadSave();
    if (save) applySave(world, save);
    screen = SCREEN_PLAY;
    announce('Continued your save.');
  },
  resume() { screen = SCREEN_PLAY; },
  quitToTitle() {
    persist();
    screen = SCREEN_TITLE;
    screens.showTitle(saveState(), hasSave());
  },
  retry() {
    audio.unlock();
    startNewGame(world);
    screen = SCREEN_PLAY;
  },
});

function showDialogLine() {
  const line = currentDialogLine(world);
  if (!line) { hud.hideDialog(); return; }
  const who = CHARACTERS[line.who] || { name: line.who };
  hud.showDialog(who.name, line.text);
}

function endGame(kind) {
  if (kind === 'busted') {
    world.money = Math.max(0, world.money - 200);
    persist();
    screens.showOver('busted', saveState());
  } else {
    persist();
    screens.showOver('wasted', saveState());
  }
  screen = SCREEN_OVER;
  announce(kind === 'busted' ? 'Busted by the police.' : 'Wasted.');
}

function runShot(name) {
  const staged = stageShot(name, world, camera, audio, hud, stepWorld);
  // Paint a few frames so the renderer, HUD and minimap are all settled, then signal ready.
  let painted = 0;
  function paint() {
    const now = performance.now() / 1000;
    const target = world.player.inCar
      ? { x: world.player.inCar.x, y: 0, z: world.player.inCar.z }
      : { x: world.player.x, y: 0, z: world.player.z };
    if (staged.mode === 'city') {
      renderer.camera.position.set(120, 170, 330);
      renderer.camera.lookAt(0, 20, -60);
    } else {
      camera.snap(target, !!world.player.inCar);
      camera.update(1 / 60, target, world.player.inCar ? Math.abs(world.player.inCar.speed) : 0, !!world.player.inCar);
    }
    hud.update(world, now);
    minimap.draw(minimapState(world));
    if (staged.prompt) hud.showPrompt(staged.prompt);
    if (staged.dialog) hud.showDialog(staged.dialog.name, staged.dialog.text);
    if (dialogActive(world)) showDialogLine();
    renderer.draw(currentWaypoint(world), now);
    painted += 1;
    if (painted < 4) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let autosaveTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const nowS = now / 1000;
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; screens.showPause(saveState()); persist(); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; }
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      // Idle world behind the title: traffic and pedestrians keep moving.
      while (accumulator >= STEP) {
        stepWorld(world, STEP, { move: () => ({ f: 0, s: 0, run: false }), takeActions: () => 0, takeMouse: () => ({ dx: 0, dy: 0 }), firing: () => false, takeWeaponKey: () => 0 }, camera, audio, hud);
        accumulator -= STEP;
      }
      const target = { x: world.player.x, y: 0, z: world.player.z };
      camera.update(1 / 60, target, 0, false);
      hud.update(world, nowS);
      minimap.draw(minimapState(world));
      renderer.draw(currentWaypoint(world), nowS);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      hud.update(world, nowS);
      renderer.draw(currentWaypoint(world), nowS);
      return;
    }

    const mouse = input.takeMouse();
    camera.orbit(mouse.dx, mouse.dy);
    while (accumulator >= STEP) {
      const events = stepWorld(world, STEP, input, camera, audio, hud);
      accumulator -= STEP;
      if (events & EVENT_WASTED) { endGame('wasted'); return; }
      if (events & EVENT_BUSTED) { endGame('busted'); return; }
      if (events & EVENT_STORY_DONE) hud.toast('STORY COMPLETE — Solmarina is yours, Rook!', 5);
    }
    const target = world.player.inCar
      ? { x: world.player.inCar.x, y: 0, z: world.player.inCar.z }
      : { x: world.player.x, y: 0, z: world.player.z };
    camera.update(1 / 60, target, world.player.inCar ? Math.abs(world.player.inCar.speed) : 0, !!world.player.inCar);
    if (dialogActive(world)) showDialogLine();
    else if (world.shopOpen) { /* dialog already shown by world */ }
    else {
      const prompt = nearestCarPrompt(world);
      if (prompt) hud.showPrompt(prompt);
      else if (garagePrompt(world)) hud.showPrompt('E — MARA\'S GARAGE SHOP');
      else hud.showPrompt('');
    }
    hud.update(world, nowS);
    minimap.draw(minimapState(world));
    renderer.draw(currentWaypoint(world), nowS);
    autosaveTimer += 1 / 60;
    if (autosaveTimer > 20) { autosaveTimer = 0; persist(); }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      screens.showPause(saveState());
      persist();
    }
  });
  canvas.addEventListener('pointerdown', () => audio.unlock());

  screens.showTitle(saveState(), hasSave());
  announce('Solmarina. Press New Game to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
