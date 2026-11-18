// The player on foot: third-person movement relative to the camera yaw, running with Shift,
// jumping with Space, and entering or stealing the nearest car with E. The mesh is a simple
// original character — jacket, jeans, cap — built from boxes.
import * as THREE from 'three';
import { PLAYER } from './config.js';
import { collideBuildings } from './city.js';

export function createPlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.42), new THREE.MeshLambertMaterial({ color: 0x2a9d8f }));
  jacket.position.y = 1.12;
  group.add(jacket);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.78;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), new THREE.MeshLambertMaterial({ color: 0xe63946 }));
  cap.position.y = 2.02;
  group.add(cap);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.36), new THREE.MeshLambertMaterial({ color: 0x2b2f36 }));
  legs.position.y = 0.31;
  group.add(legs);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), new THREE.MeshLambertMaterial({ color: 0x2a9d8f }));
  armL.position.set(-0.48, 1.1, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.48;
  group.add(armR);
  return group;
}

export function createPlayer(scene, x, z) {
  const mesh = createPlayerMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh, x, z, y: 0, vy: 0, heading: Math.PI, speed: 0, phase: 0,
    health: PLAYER.maxHealth, onGround: true, inCar: null, punchTimer: 0,
  };
}

// Walk the player. Returns true when the player moved this step.
export function walkPlayer(player, dt, move, camYaw, colliders) {
  const run = move.run;
  const speed = run ? PLAYER.run : PLAYER.walk;
  const fx = -Math.sin(camYaw);
  const fz = -Math.cos(camYaw);
  const rx = -Math.cos(camYaw);
  const rz = Math.sin(camYaw);
  let mx = fx * move.f + rx * move.s;
  let mz = fz * move.f + rz * move.s;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    player.heading = Math.atan2(mx, mz);
    player.x += mx * speed * dt;
    player.z += mz * speed * dt;
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  if (player.y > 0 || !player.onGround) {
    player.vy -= 22 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) { player.y = 0; player.vy = 0; player.onGround = true; }
  }
  const fixed = collideBuildings(colliders, player.x, player.z, PLAYER.radius);
  player.x = Math.max(-310, Math.min(310, fixed.x));
  player.z = Math.max(-310, Math.min(460, fixed.z));
  player.mesh.position.set(player.x, player.y, player.z);
  player.mesh.rotation.y = player.heading;
  player.phase += dt * player.speed * 2.2;
  const bob = player.speed > 0 ? Math.abs(Math.sin(player.phase)) * 0.08 : 0;
  player.mesh.position.y = player.y + bob;
  return len > 0.01;
}

export function jumpPlayer(player) {
  if (player.onGround) {
    player.vy = PLAYER.jump;
    player.onGround = false;
  }
}

export function hurtPlayer(player, amount) {
  player.health = Math.max(0, player.health - amount);
  return player.health <= 0;
}

export function healPlayer(player, amount) {
  player.health = Math.min(PLAYER.maxHealth, player.health + amount);
}
