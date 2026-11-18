// Pedestrians: simple people built from boxes who stroll the sidewalks, turn at corners,
// and run away from gunfire or a speeding car. They give the city life and give the player
// someone to bump into — which the police notice.
import * as THREE from 'three';
import { CITY } from './config.js';

const SHIRTS = [0xe63946, 0x2a9d8f, 0xf4a261, 0x3a7bd5, 0xe9c46a, 0x9b5de5, 0xef476f, 0x06d6a0];

function makePedMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.72;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), new THREE.MeshLambertMaterial({ color: 0x2b2f36 }));
  legs.position.y = 0.3;
  group.add(legs);
  return group;
}

export function createPedestrians(scene, random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const alongRoad = random() < 0.5;
    const road = CITY.roadAt(Math.floor(random() * CITY.blocks));
    const pos = -CITY.half + random() * CITY.half * 2;
    const ped = {
      x: alongRoad ? road + 9 : pos,
      z: alongRoad ? pos : road + 9,
      heading: alongRoad ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: 1.1 + random() * 0.7,
      fleeing: 0,
      phase: random() * Math.PI * 2,
      mesh: makePedMesh(SHIRTS[Math.floor(random() * SHIRTS.length)]),
    };
    ped.mesh.position.set(ped.x, 0, ped.z);
    scene.add(ped.mesh);
    peds.push(ped);
  }
  return { peds, random };
}

export function scarePedestrians(peds, x, z, radius) {
  for (const ped of peds) {
    if (Math.hypot(ped.x - x, ped.z - z) < radius) {
      ped.fleeing = 3 + Math.random() * 2;
      ped.heading = Math.atan2(ped.x - x, ped.z - z);
    }
  }
}

export function updatePedestrians(crowd, dt, danger) {
  for (const ped of crowd.peds) {
    if (danger && Math.hypot(ped.x - danger.x, ped.z - danger.z) < 6) ped.fleeing = 2;
    const speed = ped.fleeing > 0 ? 4.5 : ped.speed;
    if (ped.fleeing > 0) ped.fleeing -= dt;
    const alongX = Math.abs(Math.sin(ped.heading)) > 0.7;
    const pos = alongX ? ped.x : ped.z;
    const nextRoad = Math.round(pos / 60) * 60;
    if (Math.abs(pos - nextRoad) < 1 && ped.fleeing <= 0 && crowd.random() < dt * 0.4) {
      ped.heading += crowd.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    ped.x += Math.sin(ped.heading) * speed * dt;
    ped.z += Math.cos(ped.heading) * speed * dt;
    if (ped.x > CITY.half + 10) ped.x = -CITY.half - 10;
    if (ped.x < -CITY.half - 10) ped.x = CITY.half + 10;
    if (ped.z > CITY.half + 10) ped.z = -CITY.half - 10;
    if (ped.z < -CITY.half - 10) ped.z = CITY.half + 10;
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.heading;
    ped.phase += dt * speed * 3;
    ped.mesh.position.y = Math.abs(Math.sin(ped.phase)) * 0.05;
  }
}
