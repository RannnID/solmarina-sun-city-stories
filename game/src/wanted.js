// The wanted system: heat rises when the player commits crimes in sight of the law and
// decays while unseen. The star level (0-5) decides how many police cars hunt the player and
// how fast they are. Stealing a car or shooting in public is a crime; hiding breaks the line
// of sight and lets the heat cool.
import { WANTED } from './config.js';

export function createWanted() {
  return { level: 0, heat: 0, seen: 0, hidden: 0 };
}

export function addCrime(wanted, amount, reason) {
  wanted.heat += amount;
  const next = Math.min(5, Math.floor(wanted.heat / 20) + (wanted.heat >= 8 ? 1 : 0));
  const raised = next > wanted.level;
  wanted.level = Math.max(wanted.level, next);
  return { raised, reason };
}

export function updateWantedLevel(wanted, dt, visibleToPolice) {
  if (visibleToPolice) {
    wanted.seen += dt;
    wanted.hidden = 0;
  } else {
    wanted.hidden += dt;
    wanted.seen = 0;
    wanted.heat = Math.max(0, wanted.heat - WANTED.decay * dt * (wanted.hidden > 8 ? 3 : 1));
    if (wanted.heat < 4) wanted.level = 0;
    else if (wanted.heat < 20) wanted.level = Math.min(wanted.level, 1);
    else if (wanted.heat < 40) wanted.level = Math.min(wanted.level, 2);
    else if (wanted.heat < 60) wanted.level = Math.min(wanted.level, 3);
    else if (wanted.heat < 80) wanted.level = Math.min(wanted.level, 4);
  }
  return wanted.level;
}

export function clearWanted(wanted) {
  wanted.level = 0;
  wanted.heat = 0;
  wanted.seen = 0;
  wanted.hidden = 0;
}

export function wantedStars(wanted) {
  return wanted.level;
}
