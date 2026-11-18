// Lightweight particle pool: dust kicked up by wheels, smoke from crashes, muzzle flashes
// and sparks. One THREE.Points cloud, positions updated in place, no allocation per frame.
import * as THREE from 'three';

const MAX = 400;

export function createParticles(scene) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.9 });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < MAX; i += 1) parts.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, x: 0, y: -99, z: 0 });
  let cursor = 0;

  function spawn(x, y, z, vx, vy, vz, life, r, g, b) {
    const p = parts[cursor];
    cursor = (cursor + 1) % MAX;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.life = life; p.max = life;
    const i3 = parts.indexOf(p) * 3;
    colors[i3] = r; colors[i3 + 1] = g; colors[i3 + 2] = b;
  }

  return {
    burst(x, y, z, n, color, speed, life) {
      const r = ((color >> 16) & 255) / 255;
      const g = ((color >> 8) & 255) / 255;
      const b = (color & 255) / 255;
      for (let i = 0; i < n; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.4 + Math.random() * 0.8);
        spawn(x, y, z, Math.cos(a) * s, 1 + Math.random() * 2, Math.sin(a) * s, life * (0.6 + Math.random() * 0.7), r, g, b);
      }
    },
    dust(x, y, z) { spawn(x, y, z, (Math.random() - 0.5) * 2, 0.6 + Math.random(), (Math.random() - 0.5) * 2, 0.7, 0.75, 0.68, 0.55); },
    smoke(x, y, z) { spawn(x, y, z, (Math.random() - 0.5) * 1.2, 1.5 + Math.random(), (Math.random() - 0.5) * 1.2, 1.6, 0.25, 0.25, 0.28); },
    update(dt) {
      for (let i = 0; i < MAX; i += 1) {
        const p = parts[i];
        const i3 = i * 3;
        if (p.life <= 0) { positions[i3 + 1] = -99; continue; }
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 2 * dt;
        positions[i3] = p.x;
        positions[i3 + 1] = p.y;
        positions[i3 + 2] = p.z;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
