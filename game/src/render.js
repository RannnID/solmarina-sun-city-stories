// The three.js renderer and the sun-soaked look: a warm afternoon sun low in the west, a
// pale orange sky, soft fog, and ACES tone mapping. Shadows are kept to one directional light
// with a modest map so the game holds 60 fps on a desktop browser.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 220, 700);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sun.position.set(-180, 140, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffe0b3, 0x8a7a5a, 1.1);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 8, 14);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // A marker cone that floats over the active mission waypoint, visible from far away.
  const markerGeo = new THREE.ConeGeometry(1.6, 4, 8);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.rotation.x = Math.PI;
  marker.visible = false;
  scene.add(marker);
  const markerRing = new THREE.Mesh(new THREE.RingGeometry(3, 4.2, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide }));
  markerRing.rotation.x = -Math.PI / 2;
  markerRing.visible = false;
  scene.add(markerRing);

  return {
    renderer, scene, camera,
    draw(waypoint, now) {
      if (waypoint) {
        marker.visible = true;
        markerRing.visible = true;
        marker.position.set(waypoint.x, 16 + Math.sin(now * 2) * 1.2, waypoint.z);
        markerRing.position.set(waypoint.x, 0.15, waypoint.z);
        marker.rotation.y = now;
      } else {
        marker.visible = false;
        markerRing.visible = false;
      }
      renderer.render(scene, camera);
    },
  };
}
