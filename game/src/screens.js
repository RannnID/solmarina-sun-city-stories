// The title, pause and game-over screens: DOM overlays on top of the canvas. The title
// lists mission progress and the save state; pause shows stats; game over shows WASTED or
// BUSTED with the run's earnings.
import { missionTitle } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createScreens(callbacks) {
  const el = (id) => document.getElementById(id);
  const title = el('titlescreen');
  const pause = el('pausescreen');
  const over = el('overscreen');
  let current = SCREEN_TITLE;

  function show(which) {
    current = which;
    title.style.display = which === SCREEN_TITLE ? 'flex' : 'none';
    pause.style.display = which === SCREEN_PAUSED ? 'flex' : 'none';
    over.style.display = which === SCREEN_OVER ? 'flex' : 'none';
  }

  el('btn-new').addEventListener('click', () => callbacks.newGame());
  el('btn-continue').addEventListener('click', () => callbacks.continueGame());
  el('btn-resume').addEventListener('click', () => callbacks.resume());
  el('btn-quit').addEventListener('click', () => callbacks.quitToTitle());
  el('btn-retry').addEventListener('click', () => callbacks.retry());
  el('btn-title2').addEventListener('click', () => callbacks.quitToTitle());

  return {
    show,
    get current() { return current; },
    showTitle(state, hasSaveGame) {
      const lines = [];
      for (let i = 0; i < 8; i += 1) {
        const done = state.missionsDone > i;
        lines.push(`${done ? '✔' : '○'} Mission ${i + 1} — ${missionTitle(i)}`);
      }
      el('missionlist').innerHTML = `Missions: <b>${state.missionsDone}/8</b> done &nbsp;·&nbsp; Cash $${state.money.toLocaleString('en-US')}<br>${lines.join('<br>')}`;
      el('btn-continue').style.display = hasSaveGame ? '' : 'none';
      show(SCREEN_TITLE);
    },
    showPause(state) {
      el('pausepanel').innerHTML = `Cash $${state.money.toLocaleString('en-US')} &nbsp;·&nbsp; Missions ${state.missionsDone}/8<br>Packages ${state.packagesFound}/10 &nbsp;·&nbsp; Races won ${state.raceWins}<br>Weapons: ${state.weapons.join(', ') || 'fists'} &nbsp;·&nbsp; Cars owned ${state.ownedCars}`;
      show(SCREEN_PAUSED);
    },
    showOver(kind, state) {
      el('overtitle').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
      el('oversub').textContent = kind === 'busted'
        ? 'The Solmarina police took you in. Bail is $200 — Mara is not happy.'
        : 'Rook is down. The streets of Solmarina keep moving without you.';
      el('overpanel').innerHTML = `Missions done ${state.missionsDone}/8 &nbsp;·&nbsp; Cash $${state.money.toLocaleString('en-US')}<br>Packages ${state.packagesFound}/10 &nbsp;·&nbsp; Day ${state.day}`;
      show(SCREEN_OVER);
    },
  };
}
