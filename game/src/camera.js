// Third-person chase camera: sits behind the player or the car, lerps to its target, orbits
// with the mouse, and pulls up and back with speed so driving feels fast. Collision with the
// ground is clamped, not raycast — the city is flat.
import * as THREE from 'three';

export function createCamera(camera) {
  let yaw = Math.PI;
  let pitch = 0.32;
  let pos = new THREE.Vector3(0, 8, 14);
  let look = new THREE.Vector3(0, 1, 0);

  return {
    orbit(dx, dy) {
      yaw -= dx * 0.0032;
      pitch = Math.max(0.08, Math.min(1.1, pitch + dy * 0.0022));
    },
    setYaw(value) { yaw = value; },
    get yaw() { return yaw; },
    update(dt, target, speed, driving) {
      const dist = driving ? 10.5 + Math.min(6, speed * 0.12) : 7.5;
      const height = driving ? 3.6 + Math.min(2, speed * 0.04) : 2.8;
      const tx = target.x - Math.sin(yaw) * dist;
      const tz = target.z - Math.cos(yaw) * dist;
      const ty = target.y + height + Math.sin(pitch) * dist * 0.45;
      const k = 1 - Math.pow(0.0001, dt);
      pos.x += (tx - pos.x) * k;
      pos.y += (ty - pos.y) * k;
      pos.z += (tz - pos.z) * k;
      if (pos.y < 1.2) pos.y = 1.2;
      look.x += (target.x - look.x) * k;
      look.y += ((target.y + 1.4) - look.y) * k;
      look.z += (target.z - look.z) * k;
      camera.position.copy(pos);
      camera.lookAt(look);
    },
    snap(target, driving) {
      const dist = driving ? 10.5 : 7.5;
      pos.set(target.x - Math.sin(yaw) * dist, target.y + 3.6, target.z - Math.cos(yaw) * dist);
      look.set(target.x, target.y + 1.4, target.z);
      camera.position.copy(pos);
      camera.lookAt(look);
    },
  };
}
