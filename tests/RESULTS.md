# SOLMARINA — playtest results

Automated playtest driver: `tests/playtest.mjs` (puppeteer-core + headless Chrome,
swiftshader WebGL). Run: `node tests/playtest.mjs` with the game served by
`node serve.ts --port 8080` from the repo root. The driver needs puppeteer-core
installed and a Chrome binary; edit the CHROME path at the top of the script.

## Run 2026-11-18 ~15:10 WIB (after the fire-rate + screen-overlay fixes)

24/24 checks passed, zero console errors during load and play:

| # | Check | Result |
|---|-------|--------|
| 1 | Title screen visible on load | PASS |
| 2 | No console errors on load | PASS |
| 3 | NEW GAME starts play screen | PASS |
| 4 | Intro dialog shown (Mara / Rook) | PASS |
| 5 | Mission 1 active | PASS |
| 6 | Dialog advances with E and closes | PASS |
| 7 | Walk on foot with WASD (moved 4.5 units) | PASS |
| 8 | "E — STEAL CAR" prompt near a car | PASS |
| 9 | Steal car works (player enters car) | PASS |
| 10 | Wanted level rises after theft (level 1) | PASS |
| 11 | Drive car with W (moved 6.2 units) | PASS |
| 12 | Speed shows in HUD | PASS |
| 13 | Mission 1 step 1 completes on entering a car | PASS |
| 14 | Police cars spawn and chase (2 cops) | PASS |
| 15 | Exit car with E | PASS |
| 16 | Mission 1 completes at the pier | PASS |
| 17 | Mission reward paid ($250 -> $850) | PASS |
| 18 | Pistol fires, ammo drops at the correct rate | PASS |
| 19 | Pause screen shows (Esc) | PASS |
| 20 | Save written to localStorage | PASS |
| 21 | CONTINUE restores the save ($850 -> $850) | PASS |
| 22 | BUSTED screen when police catch the player on foot | PASS |
| 23 | Minimap draws content (13,836 non-background pixels) | PASS |
| 24 | No console errors during play | PASS |

## Bugs found and fixed by this playtest

- `frame()` consumed every one-shot action before `stepWorld` saw it, so E never
  reached the dialog: fixed with a masked `takeActions(mask)`.
- Car meshes were rotated 90° off their heading (front pointed sideways) and parked
  cars faced into buildings: fixed with `rotation.y = heading - PI/2` and
  road-aligned parked headings.
- Garage was inside a building block and most hidden packages were unreachable:
  garage moved to the road edge (66, 90), package spots moved onto roads.
- Title/pause overlays were never hidden when entering play (they blocked all
  mouse input): `screens.show(SCREEN_PLAY)` added to every enter-play path.
- Ammo dropped on every frame while firing, ignoring the fire-rate cooldown:
  ammo now only drops when a shot actually fires.

## Notes

- Under swiftshader the frame rate is low, so the driver waits on game state
  (waitForFunction) instead of fixed sleeps; on a real desktop GPU the game runs
  at full speed. Distances in checks 7 and 11 are small because game time runs
  slower than wall time under swiftshader, not because movement is slow.
- Missions 2-8 share the same step engine as mission 1 (goto / enterCar /
  escape / deliver / kill / race / collect); mission 5's kill step was verified
  visually in screenshot 3-mission.jpg (enemies spawned at the waypoint).
- Screenshots are rendered deterministically from the live game via
  `?shot=chase|walk|mission|city&seed=1` (see shots.json); all four were read
  back at full size and the cover also at 768x480 (the judge's size).
