/*
 * DhruRacing – A simple 3D racing game built with Three.js.
 *
 * This game demonstrates a minimal 3D racing experience in a web browser. A
 * car advances down a seemingly infinite road while the player steers left
 * and right using the arrow keys or A/D keys. A running distance counter
 * provides feedback on progress. The game uses only freely available
 * resources (Three.js from a CDN) and simple geometry for the car and road.
 */

import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

// Initialize core objects: scene, camera and renderer
const scene = new THREE.Scene();
// Give the scene a subtle sky‑blue backdrop
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

// Create the WebGL renderer with anti‑aliasing for smoother edges
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
// A soft ambient light to ensure no surface is completely dark
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
// Directional light simulates sunlight shining from above and slightly ahead
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(5, 10, -5);
scene.add(directionalLight);

// Road parameters
const roadWidth = 8;
const roadLength = 2000; // long plane; the car will move and we will recycle lines

// Create the road as a long plane
const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength);
const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2; // lay flat horizontally
road.position.z = roadLength / 2 - 100;
scene.add(road);

// Add dashed lane lines to the road using simple boxes
function createLaneLines() {
  const lineGroup = new THREE.Group();
  const lineGeometry = new THREE.BoxGeometry(0.1, 0.02, 4);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // Place lane markers along the road
  for (let z = 0; z < roadLength; z += 20) {
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(0, 0.011, z);
    lineGroup.add(line);
  }
  return lineGroup;
}
const laneLines = createLaneLines();
scene.add(laneLines);

// Build a very simple car using boxes and cylinders
function createCar() {
  const car = new THREE.Group();
  // Body
  const bodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 3);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff3333 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.25;
  car.add(body);
  // Cabin
  const cabinGeometry = new THREE.BoxGeometry(0.9, 0.4, 1.5);
  const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0xff6666 });
  const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
  cabin.position.set(0, 0.55, -0.3);
  car.add(cabin);
  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
  const wheelPositions = [
    [-0.6, 0.15, -1.0],
    [0.6, 0.15, -1.0],
    [-0.6, 0.15, 1.0],
    [0.6, 0.15, 1.0],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    car.add(wheel);
  });
  return car;
}
const car = createCar();
scene.add(car);

// Position the camera behind and slightly above the car
camera.position.set(0, 3, -8);
camera.lookAt(car.position);

// Track keyboard state for input
const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

// Distance traveled by the car (in arbitrary units)
let distance = 0;

function animate() {
  requestAnimationFrame(animate);
  // Move the car forward every frame
  const forwardSpeed = 0.2;
  car.position.z += forwardSpeed;
  distance += forwardSpeed;
  // Handle horizontal movement
  const lateralSpeed = 0.15;
  if (keys['arrowleft'] || keys['a']) {
    car.position.x -= lateralSpeed;
  }
  if (keys['arrowright'] || keys['d']) {
    car.position.x += lateralSpeed;
  }
  // Keep the car within road boundaries
  const boundary = roadWidth / 2 - 0.75;
  if (car.position.x < -boundary) car.position.x = -boundary;
  if (car.position.x > boundary) car.position.x = boundary;
  // Move lane lines backward relative to the car to simulate motion
  laneLines.position.z = -car.position.z;
  // Update camera to follow the car
  camera.position.x = car.position.x;
  camera.position.z = car.position.z - 8;
  camera.lookAt(car.position.x, car.position.y + 1, car.position.z + 5);
  // Update score display
  const scoreEl = document.getElementById('score');
  if (scoreEl) {
    scoreEl.textContent = `Distance: ${Math.floor(distance)} m`;
  }
  // Render the scene from the camera's perspective
  renderer.render(scene, camera);
}

animate();

// Adjust renderer and camera when the window is resized
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});