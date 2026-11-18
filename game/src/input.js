// Keyboard and mouse input. Held keys give movement; one-shot presses (interact, pause,
// punch, reload, weapon switch, mute) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Mouse movement orbits the
// camera; the left button fires the current weapon.
export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_JUMP = 4;
export const ACTION_PUNCH = 8;
export const ACTION_RELOAD = 16;
export const ACTION_MUTE = 32;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseDX = 0;
  let mouseDY = 0;
  let mouseDown = false;
  let weaponKey = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    else if (event.code === 'Space') actions |= ACTION_JUMP;
    else if (event.code === 'KeyF') actions |= ACTION_PUNCH;
    else if (event.code === 'KeyR') actions |= ACTION_RELOAD;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'Digit1') weaponKey = 1;
    else if (event.code === 'Digit2') weaponKey = 2;
    else if (event.code === 'Digit3') weaponKey = 3;
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  document.addEventListener('mousemove', (event) => {
    mouseDX += event.movementX || 0;
    mouseDY += event.movementY || 0;
  });
  canvas.addEventListener('mousedown', (event) => { if (event.button === 0) mouseDown = true; });
  window.addEventListener('mouseup', (event) => { if (event.button === 0) mouseDown = false; });

  function has(set) { for (const code of set) if (held.has(code)) return true; return false; }

  return {
    move() {
      return {
        f: (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0),
        s: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0),
        run: has(RUN),
      };
    },
    takeMouse() { const d = { dx: mouseDX, dy: mouseDY }; mouseDX = 0; mouseDY = 0; return d; },
    firing() { return mouseDown; },
    takeWeaponKey() { const k = weaponKey; weaponKey = 0; return k; },
    takeActions() { const taken = actions; actions = 0; return taken; },
  };
}
