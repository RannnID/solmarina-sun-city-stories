// AI traffic: cars that drive the road grid, turn at intersections, keep a gap to the car
// ahead and stop when blocked. Traffic cars are parked or moving; stealing one pulls it out
// of the traffic pool and into the player's hands.
import { CITY } from './config.js';
import { createVehicle, createVehicleMesh, driveVehicle, syncVehicleMesh } from './vehicles.js';

const TRAFFIC_TYPES = ['sedan', 'sedan', 'van', 'pickup', 'sport', 'sedan', 'pickup'];

export function createTraffic(scene, random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const type = TRAFFIC_TYPES[Math.floor(random() * TRAFFIC_TYPES.length)];
    const alongRoad = random() < 0.5;
    const road = CITY.roadAt(Math.floor(random() * CITY.blocks));
    const pos = -CITY.half + random() * CITY.half * 2;
    const heading = alongRoad ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const car = createVehicle(type, alongRoad ? road + (random() < 0.5 ? 3.4 : -3.4) : pos, alongRoad ? pos : road + (random() < 0.5 ? 3.4 : -3.4), heading);
    car.speed = 9 + random() * 6;
    car.parked = false;
    car.mesh = createVehicleMesh(type);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    scene.add(car.mesh);
    cars.push(car);
  }
  return { cars, scene, random };
}

function nearestRoadCoord(v) {
  return Math.round(v / 60) * 60;
}

function carAhead(traffic, car) {
  let best = Infinity;
  for (const other of traffic.cars) {
    if (other === car || other.parked) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 14 || dist < 0.1) continue;
    const forward = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
    if (forward > 0 && forward < best) best = forward;
  }
  return best;
}

// One traffic step: follow the current road, turn at the next intersection, yield to cars.
export function updateTraffic(traffic, dt) {
  for (const car of traffic.cars) {
    if (car.parked) continue;
    const gap = carAhead(traffic, car);
    if (gap < 7) {
      car.speed = Math.max(0, car.speed - 20 * dt);
    } else {
      car.speed += (12 - car.speed) * dt * 0.5;
    }
    const alongX = Math.abs(Math.sin(car.heading)) > 0.7;
    const pos = alongX ? car.x : car.z;
    const nextRoad = nearestRoadCoord(pos + (alongX ? Math.sign(Math.sin(car.heading)) * 10 : Math.sign(Math.cos(car.heading)) * 10));
    const atIntersection = Math.abs(pos - nextRoad) < 1.2;
    if (atIntersection && traffic.random() < dt * 0.55) {
      const turn = traffic.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      car.heading += turn;
      if (alongX) car.z = nearestRoadCoord(car.z) + (car.heading > 0 ? 3.4 : -3.4) * 0;
      else car.x = nearestRoadCoord(car.x);
    }
    // Snap back onto the lane so cars never drift into buildings.
    if (alongX) car.z += (nearestRoadCoord(car.z) + (Math.cos(car.heading) >= 0 ? 3.4 : -3.4) - car.z) * Math.min(1, dt * 2);
    else car.x += (nearestRoadCoord(car.x) + (Math.sin(car.heading) >= 0 ? 3.4 : -3.4) - car.x) * Math.min(1, dt * 2);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    if (car.x > CITY.half + 20 || car.x < -CITY.half - 20 || car.z > CITY.half + 20 || car.z < -CITY.half - 20) {
      car.x = -CITY.half + traffic.random() * CITY.half * 2;
      car.z = CITY.roadAt(Math.floor(traffic.random() * CITY.blocks));
      car.heading = Math.PI / 2;
    }
    syncVehicleMesh(car);
  }
}

export function nearestTrafficCar(traffic, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of traffic.cars) {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function removeTrafficCar(traffic, car) {
  const i = traffic.cars.indexOf(car);
  if (i >= 0) traffic.cars.splice(i, 1);
}

export function addTrafficCar(traffic, car) {
  traffic.cars.push(car);
}
