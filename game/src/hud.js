// The DOM HUD: health bar, cash, wanted stars, clock, mission objective and timer, speed,
// weapon and ammo, the interaction prompt, the dialog box and toast messages. Updated from
// the world state each frame; text is only rewritten when it changes.
import { WEAPONS, MISSION_COUNT } from './config.js';
import { missionTitle, stepLabel } from './missions.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const els = {
    health: el('healthfill'), money: el('money'), stars: el('stars'), clock: el('clock'),
    day: el('day'), label: el('missionlabel'), objective: el('objectivetext'), timer: el('timer'),
    speed: el('speed'), weapon: el('weapon'), prompt: el('prompt'),
    dialog: el('dialog'), dialogName: el('dialogname'), dialogText: el('dialogtext'),
    toast: el('toast'), damage: el('damage'), wantedFlash: el('wantedflash'),
  };
  let last = {};
  let toastUntil = 0;

  function set(key, value, apply) {
    if (last[key] !== value) { last[key] = value; apply(value); }
  }

  return {
    update(state, now) {
      set('health', Math.round(state.player.health), (v) => { els.health.style.width = `${v}%`; });
      set('money', state.money, (v) => { els.money.textContent = `$${v.toLocaleString('en-US')}`; });
      set('stars', state.wanted.level, (v) => {
        let html = '';
        for (let i = 0; i < 5; i += 1) html += `<span class="${i < v ? '' : 'dim'}">★</span>`;
        els.stars.innerHTML = html;
      });
      const hours = Math.floor(state.clock / 3600) % 24;
      const mins = Math.floor(state.clock / 60) % 60;
      set('clock', `${hours}:${String(mins).padStart(2, '0')}`, (v) => { els.clock.textContent = v; });
      set('day', state.day, (v) => { els.day.textContent = `DAY ${v} — SUNNY`; });
      if (state.missions.finished) {
        set('label', 'done', () => { els.label.textContent = 'STORY COMPLETE'; });
        set('objective', 'done', () => { els.objective.textContent = 'Solmarina is yours, Rook.'; });
      } else if (state.missions.active) {
        const label = `MISSION ${state.missions.index + 1}/${MISSION_COUNT} — ${missionTitle(state.missions.index)}`;
        set('label', label, (v) => { els.label.textContent = v; });
        set('objective', stepLabel(state.missions), (v) => { els.objective.textContent = v; });
      } else {
        set('label', 'free', () => { els.label.textContent = 'FREE ROAM — SOLMARINA'; });
        set('objective', 'free', () => { els.objective.textContent = 'Press E near a car to steal it. Find the next mission marker.'; });
      }
      const step = state.missions.active ? state.missions : null;
      set('timer', step && step.timer > 0 ? Math.ceil(step.timer) : 0, (v) => {
        els.timer.textContent = v > 0 ? `⏱ ${v}s` : '';
      });
      const kmh = state.player.inCar ? Math.round(Math.abs(state.player.inCar.speed) * 3.6) : 0;
      set('speed', kmh, (v) => { els.speed.innerHTML = `${v}<span id="speedunit"> km/h</span>`; });
      const weapon = WEAPONS[state.weapon];
      const ammoText = state.weapon === 'fists' ? '∞' : `${state.ammo[state.weapon] ?? 0} / ${weapon.ammo}`;
      set('weapon', `${weapon.name}  ${ammoText}`, (v) => { els.weapon.textContent = v; });
      if (now > toastUntil) els.toast.style.display = 'none';
      els.damage.style.opacity = state.damageFlash > 0 ? Math.min(1, state.damageFlash).toFixed(2) : '0';
      els.wantedFlash.style.opacity = state.wanted.level > 0 && Math.floor(now * 2) % 2 === 0 ? '0.7' : '0';
    },
    showPrompt(text) {
      if (last.prompt !== text) { last.prompt = text; els.prompt.textContent = text; els.prompt.style.display = text ? 'block' : 'none'; }
    },
    showDialog(name, text) {
      els.dialogName.textContent = name;
      els.dialogText.textContent = text;
      els.dialog.style.display = 'block';
    },
    hideDialog() { els.dialog.style.display = 'none'; },
    toast(text, seconds) {
      els.toast.textContent = text;
      els.toast.style.display = 'block';
      toastUntil = performance.now() / 1000 + (seconds || 2.5);
    },
    announce(text) {
      const status = document.getElementById('status');
      if (status) status.textContent = text;
    },
  };
}
