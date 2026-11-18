// The eight story missions of SOLMARINA, in order. Each mission is a list of steps; a step
// is a small objective — reach a waypoint, get in a car, lose the police, deliver packages,
// defeat enemies, or beat a race timer. Completing a mission pays cash and unlocks the next.
import { MISSION_BRIEFS, MISSION_DIALOG, MISSION_DONE_LINES } from './story.js';

export const GARAGE = { x: 30, z: 90 };
export const PIER = { x: -120, z: 330 };
export const HIDEOUT = { x: -180, z: -120 };
export const STASH = { x: 240, z: 240 };
export const LIGHTHOUSE = { x: 285, z: 285 };
export const TOWER = { x: 0, z: -240 };

const MISSIONS = [
  {
    reward: 600,
    steps: [
      { kind: 'enterCar', label: 'Steal any car — press E near one' },
      { kind: 'goto', x: PIER.x, z: PIER.z, radius: 14, label: 'Drive to the pier and find the van', inCar: true },
    ],
  },
  {
    reward: 800,
    steps: [
      { kind: 'enterCar', label: 'Get in the delivery van at the pier', type: 'van' },
      { kind: 'goto', x: GARAGE.x, z: GARAGE.z, radius: 12, label: 'Drive the van back to Mara\'s garage', inCar: true },
    ],
  },
  {
    reward: 1000,
    steps: [
      { kind: 'escape', label: 'Lose the police — stay out of sight until the stars fade', wanted: 2 },
      { kind: 'goto', x: HIDEOUT.x, z: HIDEOUT.z, radius: 12, label: 'Reach the hideout on Coral Row' },
    ],
  },
  {
    reward: 1200,
    steps: [
      { kind: 'deliver', label: 'Deliver package 1 of 3 — 150 seconds', points: [{ x: 180, z: 60 }, { x: -120, z: -60 }, { x: 60, z: -180 }], time: 150 },
    ],
  },
  {
    reward: 1500,
    steps: [
      { kind: 'goto', x: STASH.x, z: STASH.z, radius: 30, label: 'Go to the Vulture stash at Marina Point' },
      { kind: 'kill', label: 'Take back the garage money — defeat the Vultures', count: 4, at: STASH },
    ],
  },
  {
    reward: 2000,
    steps: [
      { kind: 'goto', x: TOWER.x, z: TOWER.z, radius: 14, label: 'Get to the start line in the tower district' },
      { kind: 'race', label: 'Race Kade Voss to the pier — beat 75 seconds!', x: PIER.x, z: PIER.z, radius: 16, time: 75 },
    ],
  },
  {
    reward: 3000,
    steps: [
      { kind: 'collect', label: 'Grab the cash bags at the stash house (0/3)', at: STASH, count: 3 },
      { kind: 'goto', x: GARAGE.x, z: GARAGE.z, radius: 12, label: 'Bring the cash back to the garage' },
    ],
  },
  {
    reward: 5000,
    steps: [
      { kind: 'goto', x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, radius: 30, label: 'Meet Kade Voss at the lighthouse' },
      { kind: 'kill', label: 'End this — defeat Kade and his crew', count: 5, at: LIGHTHOUSE },
      { kind: 'goto', x: PIER.x, z: PIER.z, radius: 14, label: 'Drive into the sunset. Solmarina is yours.' },
    ],
  },
];

export const PACKAGE_SPOTS = [
  { x: 150, z: -150 }, { x: -210, z: 30 }, { x: 90, z: 210 }, { x: -60, z: -210 },
  { x: 210, z: -90 }, { x: -150, z: 180 }, { x: 30, z: -60 }, { x: -240, z: -180 },
  { x: 180, z: 150 }, { x: -30, z: 270 },
];

export function createMissions() {
  return { index: 0, step: 0, timer: 0, delivered: 0, collected: 0, active: false, finished: false, stepStarted: false };
}

export function missionTitle(i) {
  return MISSION_BRIEFS[i].title;
}

export function missionBrief(i) {
  return MISSION_BRIEFS[i].brief;
}

export function missionDialog(i) {
  return MISSION_DIALOG[i];
}

export function missionDoneLine(i) {
  return MISSION_DONE_LINES[i];
}

export function currentStep(missions) {
  if (missions.finished || missions.index >= MISSIONS.length) return null;
  return MISSIONS[missions.index].steps[missions.step];
}

export function currentMissionReward(missions) {
  return MISSIONS[missions.index].reward;
}

// Begin the current mission: reset its step state and return the step for the world to set up
// (spawning enemies, vans, markers).
export function startMission(missions) {
  missions.active = true;
  missions.step = 0;
  missions.timer = 0;
  missions.delivered = 0;
  missions.collected = 0;
  missions.stepStarted = false;
  return currentStep(missions);
}

// Advance one step; returns 'mission-done' when the last step finishes.
export function advanceStep(missions) {
  missions.step += 1;
  missions.timer = 0;
  missions.delivered = 0;
  missions.collected = 0;
  missions.stepStarted = false;
  if (missions.step >= MISSIONS[missions.index].steps.length) {
    missions.active = false;
    return 'mission-done';
  }
  return currentStep(missions);
}

export function completeMission(missions) {
  const reward = MISSIONS[missions.index].reward;
  missions.index += 1;
  missions.active = false;
  if (missions.index >= MISSIONS.length) missions.finished = true;
  return reward;
}

export function missionCount() {
  return MISSIONS.length;
}

// Check the current step against the world. ctx: {x, z, inCar, carType, wanted, enemiesLeft,
// time}. Returns 'step-done', 'failed', or null. Mutates step timers and counters.
export function updateMissionStep(missions, ctx, dt) {
  const step = currentStep(missions);
  if (!step || !missions.active) return null;
  if (!missions.stepStarted) {
    missions.stepStarted = true;
    if (step.time) missions.timer = step.time;
    if (step.kind === 'deliver') missions.delivered = 0;
    if (step.kind === 'collect') missions.collected = 0;
  }
  if (step.time) {
    missions.timer -= dt;
    if (missions.timer <= 0) return 'failed';
  }
  const dist = Math.hypot(ctx.x - (step.x ?? 0), ctx.z - (step.z ?? 0));
  switch (step.kind) {
    case 'enterCar':
      if (ctx.inCar && (!step.type || ctx.carType === step.type)) return 'step-done';
      break;
    case 'goto':
      if (dist < step.radius && (!step.inCar || ctx.inCar)) return 'step-done';
      break;
    case 'escape':
      if (ctx.wanted === 0) return 'step-done';
      break;
    case 'deliver': {
      const point = step.points[missions.delivered];
      if (point && Math.hypot(ctx.x - point.x, ctx.z - point.z) < 10) {
        missions.delivered += 1;
        if (missions.delivered >= step.points.length) return 'step-done';
      }
      break;
    }
    case 'kill':
      if (ctx.enemiesLeft === 0 && missions.stepStarted) return 'step-done';
      break;
    case 'race':
      if (dist < step.radius) return 'step-done';
      break;
    case 'collect':
      if (missions.collected >= step.count) return 'step-done';
      break;
    default:
      break;
  }
  return null;
}

export function stepLabel(missions) {
  const step = currentStep(missions);
  if (!step) return '';
  if (step.kind === 'deliver') return `Deliver package ${missions.delivered + 1} of ${step.points.length} — ${Math.ceil(missions.timer)}s left`;
  if (step.kind === 'collect') return `Grab the cash bags at the stash house (${missions.collected}/${step.count})`;
  if (step.kind === 'kill') return step.label;
  if (step.kind === 'race') return `${step.label} — ${Math.ceil(missions.timer)}s`;
  return step.label;
}

export function stepWaypoint(missions) {
  const step = currentStep(missions);
  if (!step) return null;
  if (step.kind === 'deliver') return step.points[missions.delivered] ?? null;
  if (step.kind === 'kill' || step.kind === 'collect') return step.at ?? null;
  if (step.x !== undefined) return { x: step.x, z: step.z };
  return null;
}
