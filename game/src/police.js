// The Solmarina police: black-and-white patrol cars with flashing light bars that spawn at
// the city edge when the player is wanted, chase the player, ram to slow them down, and bust
// the player on foot when they get close. Siren lights blink red and blue on a timer.
import * as THREE from 'three';
import { WANTED } from './config.js';
import { createVehicle, createVehicleMesh, syncVehicleMesh } from './vehicles.js';

export function createPoliceCar(scene, x, z) {
  const car = createVehicle('sedan', x, z, 0, 0x11151c);
  car.mesh = createVehicleMesh('sedan', 0x11151c);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.02), new THREE.MeshLambertMaterial({ color: 0xf8f9fa }));
  door.position.set(0, 0.62, 0);
  car.mesh.add(door);
  car.lightbar = new THREE.Group();
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  red.position.set(0.3, 1.55, 0);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
  blue.position.set(-0.3, 1.55, 0);
  car.lightbar.add(red);
  car.lightbar.add(blue);
  car.lightbar.userData = { red, blue };
  car.mesh.add(car.lightbar);
  car.mesh.position.set(x, 0, z);
  scene.add(car.mesh);
  car.lost = 0; // seconds the player has stayed out of this cop's 70-unit sight radius
  car.ramCooldown = 0; // seconds until this cop can ram the player again
  return car;
}

export function createPolice(scene) {
  return { scene, cars: [], spawnTimer: 0, blink: 0 };
}

// Spawn enough patrol cars for the wanted level, at road positions away from the player.
export function startPolicePursuit(police, wantedLevel, playerX, playerZ, random) {
  const want = WANTED.maxCops[wantedLevel] || 0;
  while (police.cars.length < want) {
    const angle = random() * Math.PI * 2;
    const dist = 90 + random() * 60;
    const x = Math.max(-290, Math.min(290, playerX + Math.cos(angle) * dist));
    const z = Math.max(-290, Math.min(290, playerZ + Math.sin(angle) * dist));
    police.cars.push(createPoliceCar(police.scene, x, z));
  }
  while (police.cars.length > want) {
    const car = police.cars.pop();
    police.scene.remove(car.mesh);
  }
}

export function stopPolicePursuit(police) {
  for (const car of police.cars) police.scene.remove(car.mesh);
  police.cars.length = 0;
}

// Chase: steer toward the player, ram on contact, blink the light bar. Returns true when a
// cop is close enough on foot to bust the player.
export function updatePolice(police, dt, wantedLevel, player, playerCar) {
  police.blink += dt;
  const phase = Math.floor(police.blink * 4) % 2 === 0;
  const targetX = playerCar ? playerCar.x : player.x;
  const targetZ = playerCar ? playerCar.z : player.z;
  const top = WANTED.copSpeed[wantedLevel] || 0;
  let bust = false;
  for (const car of police.cars) {
    const dx = targetX - car.x;
    const dz = targetZ - car.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    // Leash: a cop that has lost sight for a while gives up the full-speed chase and
    // drops back, so a player who genuinely pulls away stays away.
    if (dist > 70) car.lost = (car.lost ?? 0) + dt;
    else car.lost = 0;
    const chaseTop = car.lost > 6 ? top * 0.4 : top;
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh * 3 * dt));
    car.speed += ((dist > 12 ? chaseTop : chaseTop * 0.7) - car.speed) * dt * 0.8;
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    if (dist < 4.5) {
      if (playerCar) {
        // Ram: a bump, not a per-step vice. The old code multiplied the player's speed
        // by 0.94 on EVERY step while a cop touched the car, pinning the van at ~2 u/s
        // forever once a cop glued to it (mission 3 was unwinnable that way). Now each
        // cop can only bump once a second, so the player can accelerate away between
        // bumps while the chase still feels physical.
        car.ramCooldown = (car.ramCooldown ?? 0) - dt;
        if (car.ramCooldown <= 0) {
          playerCar.speed *= 0.85;
          car.speed *= 0.9;
          car.ramCooldown = 1.0;
        }
      } else if (dist < WANTED.bustRadius) {
        bust = true;
      }
    }
    const { red, blue } = car.lightbar.userData;
    red.material.color.setHex(phase ? 0xff2020 : 0x550000);
    blue.material.color.setHex(phase ? 0x101080 : 0x2040ff);
    syncVehicleMesh(car);
  }
  return bust;
}

export function policePositions(police) {
  return police.cars.map((c) => ({ x: c.x, z: c.z }));
}
