// Builds the city of Solmarina as three.js meshes: a 9x9 block grid of roads and sidewalks,
// procedural buildings with warm sun-soaked colours, a beach and ocean to the south, a pier,
// the Solmarina Tower landmark, a lighthouse, palm trees and street lamps. Colliders are kept
// as plain data (building AABBs) so the game logic never touches the renderer.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildCity(scene, random) {
  const colliders = [];
  const group = new THREE.Group();
  const half = CITY.half;

  // Ground: grass base, then road and sidewalk slabs per grid line.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 260, half * 2 + 260), new THREE.MeshLambertMaterial({ color: PALETTE.grass }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  group.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  for (let i = 0; i < CITY.blocks; i += 1) {
    const c = CITY.roadAt(i);
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(CITY.road, half * 2), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(c, 0, 0);
    group.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.road), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.01, c);
    group.add(roadH);
    const walkV = new THREE.Mesh(new THREE.PlaneGeometry(CITY.road + 6, half * 2), walkMat);
    walkV.rotation.x = -Math.PI / 2;
    walkV.position.set(c, -0.02, 0);
    group.add(walkV);
    const walkH = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.road + 6), walkMat);
    walkH.rotation.x = -Math.PI / 2;
    walkH.position.set(0, -0.03, c);
    group.add(walkH);
  }

  // Buildings: one InstancedMesh of boxes, warm palette, taller toward the north tower district.
  const spots = [];
  for (let bx = 0; bx < CITY.blocks - 1; bx += 1) {
    for (let bz = 0; bz < CITY.blocks - 1; bz += 1) {
      const cx = CITY.roadAt(bx) + 30;
      const cz = CITY.roadAt(bz) + 30;
      if (cz > 270) continue; // beach strip stays open
      const count = 1 + Math.floor(random() * 2);
      for (let k = 0; k < count; k += 1) {
        const w = 14 + random() * 16;
        const d = 14 + random() * 16;
        const north = cz < -120 ? 1.8 : 1;
        const h = (8 + random() * 22) * north;
        const x = cx + (k === 0 ? -8 : 10) + (random() - 0.5) * 6;
        const z = cz + (random() - 0.5) * 10;
        spots.push({ x, z, w, h, d });
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const inst = new THREE.InstancedMesh(geo, mat, spots.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  spots.forEach((s, i) => {
    m4.makeScale(s.w, s.h, s.d);
    m4.setPosition(s.x, s.h / 2, s.z);
    inst.setMatrixAt(i, m4);
    col.setHex(PALETTE.building[i % PALETTE.building.length]);
    col.offsetHSL(0, 0, (random() - 0.5) * 0.08);
    inst.setColorAt(i, col);
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  group.add(inst);

  // Roof details: a few rooftop boxes so the skyline reads at a distance.
  spots.slice(0, 40).forEach((s) => {
    group.add(box(3, 2.5, 3, 0x8a8f98, s.x + s.w * 0.2, s.h + 1.2, s.z));
  });

  // Solmarina Tower — the landmark, north centre, tall and warm gold.
  const tower = box(22, 90, 22, 0xe8a34c, 0, 45, -240);
  group.add(tower);
  group.add(box(26, 4, 26, 0xc97b2d, 0, 92, -240));
  group.add(box(10, 8, 10, 0xfff2c0, 0, 98, -240));
  colliders.push({ minX: -11, maxX: 11, minZ: -251, maxZ: -229 });

  // Lighthouse on the east beach.
  const light = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 26, 10), new THREE.MeshLambertMaterial({ color: 0xf2ead8 }));
  light.position.set(285, 13, 285);
  group.add(light);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  lamp.position.set(285, 28, 285);
  group.add(lamp);
  colliders.push({ minX: 280, maxX: 290, minZ: 280, maxZ: 290 });

  // Beach and ocean, south of z = 300, plus the pier.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 260, 70), new THREE.MeshLambertMaterial({ color: PALETTE.sand }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, 335);
  group.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 400, 260), new THREE.MeshLambertMaterial({ color: PALETTE.ocean }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.4, 500);
  group.add(ocean);
  group.add(box(8, 1.5, 90, 0x9c6b3f, -120, 0.4, 400));
  for (let z = 372; z < 440; z += 12) {
    group.add(box(1.2, 6, 1.2, 0x6b4a2a, -123, -1, z));
    group.add(box(1.2, 6, 1.2, 0x6b4a2a, -117, -1, z));
  }

  // Palm trees along the beach road and plaza.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  for (let i = 0; i < 26; i += 1) {
    const x = -270 + i * 22 + (random() - 0.5) * 8;
    const z = 285 + (random() - 0.5) * 8;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.5, 7), leafMat);
    leaves.position.set(x, 8.4, z);
    group.add(leaves);
  }

  // Street lamps at intersections.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x44484f });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (let i = 0; i < CITY.blocks; i += 1) {
    for (let j = 0; j < CITY.blocks; j += 1) {
      const x = CITY.roadAt(i) + 9;
      const z = CITY.roadAt(j) + 9;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), lampMat);
      pole.position.set(x, 3, z);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bulbMat);
      bulb.position.set(x, 6.2, z);
      group.add(bulb);
    }
  }

  scene.add(group);
  return { colliders, towerPos: { x: 0, z: -240 }, lighthousePos: { x: 285, z: 285 } };
}

// Push a circle (player or car) out of every building AABB it overlaps.
export function collideBuildings(colliders, x, z, radius) {
  let hit = false;
  for (let i = 0; i < colliders.length; i += 1) {
    const c = colliders[i];
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      x += (dx / d) * push;
      z += (dz / d) * push;
    }
  }
  return { x, z, hit };
}
