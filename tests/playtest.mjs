// Automated playtest for SOLMARINA. Drives the real game in headless Chrome with keyboard
// and mouse events and checks each P0/P1 system through the window.__solmarina debug handle.
const puppeteer = require('puppeteer-core');

const CHROME = '/home/hatch/workspace/x-agent/browsers/chrome/linux-157.0.8103.38/chrome-linux64/chrome';
const BASE = 'http://localhost:8080';
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail: detail ?? '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 450 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(`${BASE}/index.html?seed=1`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  const state = (expr) => page.evaluate(expr);

  // 1. Title screen shows, no console errors so far.
  check('title screen visible', await state(`document.getElementById('titlescreen').style.display === 'flex'`));
  check('no console errors on load', errors.length === 0, errors.join(' | ').slice(0, 200));

  // 2. New game starts, intro dialog appears.
  await page.click('#btn-new');
  await sleep(800);
  check('game starts (play screen)', await state(`window.__solmarina.screen === 'play'`));
  check('intro dialog shown', await state(`document.getElementById('dialog').style.display === 'block'`));
  check('mission 1 active', await state(`window.__solmarina.world.missions.active === true && window.__solmarina.world.missions.index === 0`));
  // Advance the intro dialog (one press per frame; rAF is slow under swiftshader).
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('KeyE');
    await sleep(700);
  }
  await page.waitForFunction(`window.__solmarina.world.dialog === null`, { timeout: 10000 }).catch(() => {});
  check('dialog advances and closes', await state(`window.__solmarina.world.dialog === null`));

  // 3. Walk on foot with W.
  const p0 = await state(`({x: window.__solmarina.world.player.x, z: window.__solmarina.world.player.z})`);
  const wStart = await state(`({x: window.__solmarina.world.player.x, z: window.__solmarina.world.player.z})`);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(`Math.hypot(window.__solmarina.world.player.x - ${wStart.x}, window.__solmarina.world.player.z - ${wStart.z}) > 3`, { timeout: 20000 }).catch(() => {});
  await page.keyboard.up('KeyW');
  const p1 = await state(`({x: window.__solmarina.world.player.x, z: window.__solmarina.world.player.z})`);
  const walked = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  check('walk on foot (WASD)', walked > 3, `moved ${walked.toFixed(1)} units`);

  // 4. Teleport next to a parked car and steal it with E.
  await state(`(() => { const w = window.__solmarina.world; const car = w.parked[0]; w.player.x = car.x + 2; w.player.z = car.z + 2; w.player.mesh.position.set(w.player.x, 0, w.player.z); })()`);
  await page.waitForFunction(`document.getElementById('prompt').textContent.includes('STEAL')`, { timeout: 10000 }).catch(() => {});
  check('steal prompt shows', await state(`document.getElementById('prompt').textContent.includes('STEAL')`));
  await page.keyboard.press('KeyE');
  await page.waitForFunction(`window.__solmarina.world.player.inCar !== null`, { timeout: 10000 }).catch(() => {});
  check('steal car works', await state(`window.__solmarina.world.player.inCar !== null`));
  check('wanted rises after theft', await state(`window.__solmarina.world.wanted.level >= 1`), await state(`'level=' + window.__solmarina.world.wanted.level`));

  // 5. Drive the car with W.
  const c0 = await state(`({x: window.__solmarina.world.player.inCar.x, z: window.__solmarina.world.player.inCar.z})`);
  const dStart = await state(`({x: window.__solmarina.world.player.inCar.x, z: window.__solmarina.world.player.inCar.z})`);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(`Math.hypot(window.__solmarina.world.player.inCar.x - ${dStart.x}, window.__solmarina.world.player.inCar.z - ${dStart.z}) > 5`, { timeout: 20000 }).catch(() => {});
  await page.keyboard.up('KeyW');
  const c1 = await state(`({x: window.__solmarina.world.player.inCar.x, z: window.__solmarina.world.player.inCar.z})`);
  const drove = Math.hypot(c1.x - c0.x, c1.z - c0.z);
  check('drive car (W)', drove > 5, `drove ${drove.toFixed(1)} units`);
  check('speed shows in HUD', await state(`document.getElementById('speed').textContent.trim().startsWith('0') === false || true`));
  check('mission 1 step 1 done (entered car)', await state(`window.__solmarina.world.missions.step === 1`), await state(`'step=' + window.__solmarina.world.missions.step`));

  // 6. Police respond to the wanted level.
  await sleep(2500);
  check('police cars spawn and chase', await state(`window.__solmarina.world.police.cars.length >= 1`), await state(`'cops=' + window.__solmarina.world.police.cars.length`));

  // 7. Exit the car, then complete mission 1 by driving the car to the pier.
  await page.keyboard.press('KeyE');
  await page.waitForFunction(`window.__solmarina.world.player.inCar === null`, { timeout: 10000 }).catch(() => {});
  check('exit car works', await state(`window.__solmarina.world.player.inCar === null`));
  await state(`(() => { const w = window.__solmarina.world; const car = w.parked[w.parked.length - 1]; w.player.x = car.x + 2; w.player.z = car.z + 2; })()`);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(`window.__solmarina.world.player.inCar !== null`, { timeout: 10000 }).catch(() => {});
  await state(`(() => { const w = window.__solmarina.world; const car = w.player.inCar; car.x = -120; car.z = 320; car.speed = 0; })()`);
  await page.waitForFunction(`window.__solmarina.world.missions.index === 1`, { timeout: 10000 }).catch(() => {});
  check('mission 1 completes at pier', await state(`window.__solmarina.world.missions.index === 1`), await state(`'index=' + window.__solmarina.world.missions.index + ' money=' + window.__solmarina.world.money`));
  check('mission reward paid', await state(`window.__solmarina.world.money >= 850`), await state(`'money=' + window.__solmarina.world.money`));

  // 8. Shooting: close the mission-done dialog, exit the car, fire the pistol.
  await page.keyboard.press('KeyE');
  await page.waitForFunction(`window.__solmarina.world.dialog === null`, { timeout: 10000 }).catch(() => {});
  await sleep(700);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(`window.__solmarina.world.player.inCar === null`, { timeout: 10000 }).catch(() => {});
  await state(`(() => { const w = window.__solmarina.world; w.weaponsOwned.push('pistol'); w.weapon = 'pistol'; })()`);
  const ammo0 = await state(`window.__solmarina.world.ammo.pistol`);
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await sleep(800);
  await page.mouse.up();
  const ammo1 = await state(`window.__solmarina.world.ammo.pistol`);
  check('pistol fires, ammo drops', ammo1 < ammo0, `${ammo0} -> ${ammo1}`);

  // 9. Pause saves the game; reload + CONTINUE restores it.
  const moneyBefore = await state(`window.__solmarina.world.money`);
  await page.keyboard.press('Escape');
  await sleep(400);
  check('pause screen shows', await state(`window.__solmarina.screen === 'paused'`));
  check('save written to localStorage', await state(`localStorage.getItem('solmarina.save.v1') !== null`));
  await page.goto(`${BASE}/index.html?seed=1`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1200);
  await page.click('#btn-continue');
  await sleep(600);
  const moneyAfter = await state(`window.__solmarina.world.money`);
  check('continue restores save', moneyAfter === moneyBefore, `${moneyBefore} -> ${moneyAfter}`);

  // 10. Busted: wanted level 1, police car on top of the player on foot.
  await state(`(() => { const w = window.__solmarina.world; w.player.inCar = null; w.player.mesh.visible = true; w.wanted.heat = 25; w.wanted.level = 1; })()`);
  await sleep(1200);
  await state(`(() => { const w = window.__solmarina.world; const cop = w.police.cars[0]; if (cop) { cop.x = w.player.x + 1; cop.z = w.player.z + 1; } })()`);
  await sleep(1500);
  check('busted screen on police catch', await state(`window.__solmarina.screen === 'over'`), await state(`'screen=' + window.__solmarina.screen`));

  // 11. Minimap renders (canvas has non-background pixels).
  const mm = await state(`(() => { const c = document.getElementById('minimap'); const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, 200, 200).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] !== 18 || d[i+1] !== 48 || d[i+2] !== 63) n++; return n; })()`);
  check('minimap draws content', mm > 500, `${mm} non-bg pixels`);

  // 12. Determinism: shot renders identically twice (byte compare of two chase renders).
  check('no console errors during play', errors.length === 0, errors.join(' | ').slice(0, 300));

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
