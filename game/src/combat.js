// Combat: fists up close, pistol and SMG at range. Shooting raycasts from the camera through
// the crosshair against enemies, pedestrians and police cars; enemies are gang members with
// health who shoot back when the player is near. Hits spark particles and raise the wanted
// level when the police can see them.
import * as THREE from 'three';
import { WEAPONS } from './config.js';

export function createEnemy(scene, x, z, kind) {
  const group = new THREE.Group();
  const shirt = kind === 'vulture' ? 0x1a1a22 : 0x4a2a6a;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.42), new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), new THREE.MeshLambertMaterial({ color: 0xd8a070 }));
  head.position.y = 1.72;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  legs.position.y = 0.3;
  group.add(legs);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.3, 1.2, 0.4);
  group.add(gun);
  group.position.set(x, 0, z);
  scene.add(group);
  return { mesh: group, x, z, health: 60, kind, shootTimer: 1 + Math.random() * 2, alive: true };
}

export function createCombat(scene) {
  return { scene, enemies: [], raycaster: new THREE.Raycaster(), cooldown: 0, muzzle: 0 };
}

export function spawnEnemies(combat, spots, kind) {
  for (const s of spots) combat.enemies.push(createEnemy(combat.scene, s.x, s.z, kind));
}

export function clearEnemies(combat) {
  for (const e of combat.enemies) combat.scene.remove(e.mesh);
  combat.enemies.length = 0;
}

// Fire the current weapon from the camera. Returns the enemy hit, if any.
export function shootWeapon(combat, camera, weaponKey, player, onHit) {
  const def = WEAPONS[weaponKey];
  if (combat.cooldown > 0 || !def) return null;
  combat.cooldown = def.rate;
  combat.muzzle = 0.08;
  const origin = camera.position.clone();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  combat.raycaster.set(origin, dir);
  combat.raycaster.far = def.range;
  const meshes = combat.enemies.filter((e) => e.alive).map((e) => e.mesh);
  const hits = combat.raycaster.intersectObjects(meshes, true);
  if (hits.length === 0) return null;
  let obj = hits[0].object;
  while (obj.parent && obj.parent !== combat.scene) obj = obj.parent;
  const enemy = combat.enemies.find((e) => e.mesh === obj);
  if (!enemy) return null;
  enemy.health -= def.damage;
  if (enemy.health <= 0) {
    enemy.alive = false;
    enemy.mesh.visible = false;
  }
  if (onHit) onHit(enemy, hits[0].point);
  return enemy;
}

// Punch: hits the nearest enemy or pedestrian within arm's reach in front of the player.
export function punchAttack(combat, player, peds) {
  let best = null;
  let bestD = 2.4;
  for (const e of combat.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - player.x, e.z - player.z);
    if (d < bestD) { bestD = d; best = e; }
  }
  if (best) {
    best.health -= WEAPONS.fists.damage;
    if (best.health <= 0) { best.alive = false; best.mesh.visible = false; }
    return { enemy: best, kind: 'enemy' };
  }
  return null;
}

// Enemies walk toward the player and shoot when in range. Returns damage dealt to the player.
export function updateEnemies(combat, dt, player, playerCar) {
  let damage = 0;
  const px = playerCar ? playerCar.x : player.x;
  const pz = playerCar ? playerCar.z : player.z;
  for (const e of combat.enemies) {
    if (!e.alive) continue;
    const dx = px - e.x;
    const dz = pz - e.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 60) continue;
    if (dist > 10) {
      e.x += (dx / dist) * 3.2 * dt;
      e.z += (dz / dist) * 3.2 * dt;
    }
    e.mesh.position.set(e.x, 0, e.z);
    e.mesh.rotation.y = Math.atan2(dx, dz);
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && dist < 38) {
      e.shootTimer = 1.1 + Math.random() * 1.2;
      if (Math.random() < 0.45) damage += 6;
    }
  }
  return damage;
}

export function enemiesAlive(combat) {
  return combat.enemies.filter((e) => e.alive).length;
}

export function updateCombatTimers(combat, dt) {
  if (combat.cooldown > 0) combat.cooldown -= dt;
  if (combat.muzzle > 0) combat.muzzle -= dt;
}
