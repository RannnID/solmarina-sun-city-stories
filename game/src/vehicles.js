// Vehicles: five original types with different handling, built from boxes so no model
// files are needed. A car is a group with a body, cabin, wheels and lights; driving is arcade
// physics — throttle, brake/reverse, steering that tightens at low speed, handbrake drift.
import * as THREE from 'three';
import { VEHICLE_TYPES } from './config.js';

export function createVehicleMesh(typeKey, colorHex) {
  const def = VEHICLE_TYPES[typeKey];
  const [len, hgt, wid] = def.size;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: colorHex ?? def.color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(len, hgt * 0.55, wid), bodyMat);
  body.position.y = hgt * 0.42;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(len * 0.5, hgt * 0.5, wid * 0.88), darkMat);
  cabin.position.set(-len * 0.05, hgt * 0.9, 0);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181d });
  const wheels = [];
  const wx = len * 0.32;
  const wz = wid * 0.52;
  [[wx, wz], [wx, -wz], [-wx, wz], [-wx, -wz]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    group.add(wheel);
    wheels.push(wheel);
  });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, wid * 0.7), lightMat);
  head.position.set(len / 2, hgt * 0.5, 0);
  group.add(head);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, wid * 0.7), tailMat);
  tail.position.set(-len / 2, hgt * 0.5, 0);
  group.add(tail);
  group.userData.wheels = wheels;
  return group;
}

export function createVehicle(typeKey, x, z, heading, colorHex) {
  const def = VEHICLE_TYPES[typeKey];
  return {
    type: typeKey, def, mesh: null,
    x, z, heading, speed: 0, steer: 0,
    parked: true, owned: false, siren: false,
    brakeLight: 0,
  };
}

// Arcade driving: throttle accelerates toward the type's top speed, steering scales with
// speed, the handbrake cuts grip and lets the tail slide. Returns distance travelled.
export function driveVehicle(car, dt, throttle, steerInput, handbrake) {
  const def = car.def;
  if (throttle > 0) car.speed += def.accel * dt * throttle;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= def.brake * dt;
    else car.speed -= def.accel * 0.55 * dt; // reverse
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  }
  const maxFwd = def.top;
  const maxRev = -10;
  car.speed = Math.max(maxRev, Math.min(maxFwd, car.speed));
  const grip = handbrake ? def.grip * 0.45 : def.grip;
  const steerTarget = steerInput * def.turn * Math.min(1, Math.abs(car.speed) / 12);
  car.steer += (steerTarget - car.steer) * Math.min(1, grip * dt * 3);
  car.heading += car.steer * dt * Math.sign(car.speed || 1) * (handbrake ? 1.35 : 1);
  const dx = Math.sin(car.heading) * car.speed * dt;
  const dz = Math.cos(car.heading) * car.speed * dt;
  car.x += dx;
  car.z += dz;
  return Math.hypot(dx, dz);
}

export function syncVehicleMesh(car) {
  if (!car.mesh) return;
  car.mesh.position.set(car.x, 0, car.z);
  // The model's front is its local +x; the heading is the movement direction, 90° off.
  car.mesh.rotation.y = car.heading - Math.PI / 2;
  const spin = car.speed * 0.016;
  for (const wheel of car.mesh.userData.wheels) wheel.rotation.z -= spin;
}

export function vehicleName(car) {
  return car.def.name;
}
