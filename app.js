import * as BABYLON from "https://cdn.babylonjs.com/babylon.js";
import "https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const canvas = document.getElementById("game");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });

const input = {
  steer: 0,
  throttle: 0,
  brake: 0,
};

function setupKeyboard() {
  const keys = new Set();
  window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  return () => {
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");
    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");

    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    input.steer = lerp(input.steer, steer, 0.25);

    input.throttle = lerp(input.throttle, up ? 1 : 0, 0.25);
    input.brake = lerp(input.brake, down ? 1 : 0, 0.25);
  };
}

function setupTouchPads() {
  const steerPad = document.getElementById("steerPad");
  const steerKnob = document.getElementById("steerKnob");
  const pedalPad = document.getElementById("pedalPad");
  const pedalKnob = document.getElementById("pedalKnob");

  function padLogic(padEl, knobEl, onMove) {
    let activeId = null;
    let rect = null;

    const reset = () => {
      activeId = null;
      knobEl.style.transform = "translate(-50%,-50%)";
      onMove(0, 0);
    };

    const update = (clientX, clientY) => {
      if (!rect) rect = padEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (clientX - cx) / (rect.width / 2);
      const dy = (clientY - cy) / (rect.height / 2);

      const x = clamp(dx, -1, 1);
      const y = clamp(dy, -1, 1);

      const px = x * 40;
      const py = y * 40;
      knobEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;

      onMove(x, y);
    };

    padEl.addEventListener("pointerdown", (e) => {
      padEl.setPointerCapture(e.pointerId);
      activeId = e.pointerId;
      rect = padEl.getBoundingClientRect();
      update(e.clientX, e.clientY);
    });

    padEl.addEventListener("pointermove", (e) => {
      if (activeId !== e.pointerId) return;
      update(e.clientX, e.clientY);
    });

    padEl.addEventListener("pointerup", (e) => {
      if (activeId !== e.pointerId) return;
      reset();
    });

    padEl.addEventListener("pointercancel", reset);
    window.addEventListener("resize", () => {
      rect = null;
    });
  }

  padLogic(steerPad, steerKnob, (x, y) => {
    input.steer = lerp(input.steer, x, 0.35);
  });

  padLogic(pedalPad, pedalKnob, (x, y) => {
    const throttle = clamp(-y, 0, 1);
    const brake = clamp(y, 0, 1);
    input.throttle = lerp(input.throttle, throttle, 0.35);
    input.brake = lerp(input.brake, brake, 0.35);
  });
}

const tickKeyboard = setupKeyboard();
setupTouchPads();

async function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.6, 0.82, 0.97, 1.0);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.002;
  scene.fogColor = new BABYLON.Color3(0.6, 0.82, 0.97);

  const camera = new BABYLON.FollowCamera("camera", new BABYLON.Vector3(0, 5, -15), scene);
  camera.radius = 18;
  camera.heightOffset = 4;
  camera.rotationOffset = 0;
  camera.cameraAcceleration = 0.05;
  camera.maxCameraSpeed = 40;
  camera.attachControl(canvas, true);

  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.4, -1, 0.6), scene);
  sun.position = new BABYLON.Vector3(200, 300, -200);
  sun.intensity = 1.2;

  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 400, height: 800, subdivisions: 2 }, scene);
  const gmat = new BABYLON.StandardMaterial("gmat", scene);
  gmat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  gmat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  ground.material = gmat;

  const road = BABYLON.MeshBuilder.CreateBox("road", { width: 8, height: 0.05, depth: 800 }, scene);
  road.position.y = 0.025;
  const rmat = new BABYLON.StandardMaterial("rmat", scene);
  rmat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  rmat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  road.material = rmat;

  const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
  lineMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  for (let i = 0; i < 200; i++) {
    const dash = BABYLON.MeshBuilder.CreateBox("dash" + i, { width: 0.2, height: 0.05, depth: 3 }, scene);
    dash.position.set(0, 0.051, -400 + i * 4);
    dash.material = lineMat;
  }

  const barrierMat = new BABYLON.StandardMaterial("bmat", scene);
  barrierMat.diffuseColor = new BABYLON.Color3(0.7, 0.15, 0.15);
  for (let i = 0; i < 200; i++) {
    const left = BABYLON.MeshBuilder.CreateBox("barrierL" + i, { width: 0.3, height: 0.4, depth: 4 }, scene);
    left.position.set(-4.15, 0.2, -400 + i * 4);
    const right = left.clone("barrierR" + i);
    right.position.x = 4.15;
    left.material = barrierMat;
    right.material = barrierMat;
  }

  // Buildings
  for (let i = 0; i < 40; i++) {
    const w = 4 + Math.random() * 5;
    const h = 8 + Math.random() * 20;
    const d = 4 + Math.random() * 5;
    const buildingL = BABYLON.MeshBuilder.CreateBox("buildL" + i, { width: w, height: h, depth: d }, scene);
    const buildingR = BABYLON.MeshBuilder.CreateBox("buildR" + i, { width: w, height: h, depth: d }, scene);
    buildingL.position.set(-15 - w / 2 - Math.random() * 3, h / 2, -400 + i * 20 + Math.random() * 10);
    buildingR.position.set(15 + w / 2 + Math.random() * 3, h / 2, -400 + i * 20 + Math.random() * 10);
    const col = 0.3 + Math.random() * 0.4;
    const bmat = new BABYLON.StandardMaterial("bldMat" + i, scene);
    bmat.diffuseColor = new BABYLON.Color3(col, col, col);
    buildingL.material = bmat;
    buildingR.material = bmat;
  }

  // Trees
  for (let i = 0; i < 60; i++) {
    const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk" + i, { diameter: 0.4, height: 2 }, scene);
    trunk.position.set(-10 - Math.random() * 4, 1, -400 + i * 14 + Math.random() * 6);
    const leaves = BABYLON.MeshBuilder.CreateSphere("leaves" + i, { diameter: 3 }, scene);
    leaves.position.set(trunk.position.x, trunk.position.y + 2.5, trunk.position.z);
    const tmat = new BABYLON.StandardMaterial("trunkMat" + i, scene);
    tmat.diffuseColor = new BABYLON.Color3(0.43, 0.26, 0.1);
    trunk.material = tmat;
    const lmat = new BABYLON.StandardMaterial("leafMat" + i, scene);
    lmat.diffuseColor = new BABYLON.Color3(0.1 + Math.random() * 0.1, 0.35 + Math.random() * 0.3, 0.1 + Math.random() * 0.1);
    leaves.material = lmat;

    const trunk2 = trunk.clone("trunkR" + i);
    trunk2.position.x = -trunk.position.x;
    const leaves2 = leaves.clone("leavesR" + i);
    leaves2.position.x = -leaves.position.x;
  }

  const carRoot = new BABYLON.TransformNode("carRoot", scene);
  carRoot.position.set(0, 0.4, 0);
  camera.lockedTarget = carRoot;

  let carMeshes;
  try {
    const res = await BABYLON.SceneLoader.ImportMeshAsync(
      null,
      "https://github.khronos.org/glTF-Sample-Assets/Models/CarConcept/glTF-Binary/",
      "CarConcept.glb",
      scene
    );
    carMeshes = res.meshes;
  } catch (err) {
    console.error("Error loading car model", err);
    const fallback = BABYLON.MeshBuilder.CreateBox("fallbackCar", { width: 1.8, height: 0.6, depth: 3.6 }, scene);
    fallback.position.y = 0.7;
    const fm = new BABYLON.StandardMaterial("fm", scene);
    fm.diffuseColor = new BABYLON.Color3(0.95, 0.2, 0.2);
    fallback.material = fm;
    fallback.parent = carRoot;
    carMeshes = [fallback];
  }

  if (carMeshes && carMeshes.length) {
    carMeshes.forEach((mesh) => {
      mesh.scaling.scaleInPlace(0.009);
      mesh.parent = carRoot;
    });
  }

  const wheels = [];
  scene.meshes.forEach((mesh) => {
    if (mesh.name && mesh.name.toLowerCase().includes("wheel")) {
      wheels.push(mesh);
    }
  });

  let speed = 0;
  let dist = 0;
  let heading = 0;
  const params = {
    maxSpeed: 60,
    accel: 35,
    brake: 45,
    drag: 4.5,
    steerRateLow: 2.2,
    steerRateHigh: 1.3,
    grip: 10,
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    tickKeyboard();

    const steer = clamp(input.steer, -1, 1);
    const throttle = clamp(input.throttle, 0, 1);
    const brake = clamp(input.brake, 0, 1);

    speed += throttle * params.accel * dt;
    speed -= brake * params.brake * dt;
    speed -= params.drag * speed * dt;
    speed = clamp(speed, 0, params.maxSpeed);

    const sRate = lerp(params.steerRateLow, params.steerRateHigh, clamp(speed / params.maxSpeed, 0, 1));
    heading += steer * sRate * dt;

    const forward = new BABYLON.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const velocity = forward.scale(speed);
    const next = carRoot.position.add(velocity.scale(dt));
    next.x = clamp(next.x, -3.8, 3.8);
    carRoot.position = BABYLON.Vector3.Lerp(carRoot.position, next, clamp(params.grip * dt, 0, 1));

    const pitch = lerp(carRoot.rotation.x || 0, -0.015 * throttle + 0.025 * brake, 0.2);
    const roll = lerp(carRoot.rotation.z || 0, -steer * speed / params.maxSpeed * 0.4, 0.2);
    carRoot.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(heading, pitch, roll);

    const wheelCircumference = 0.6;
    const wheelRot = (speed * dt) / wheelCircumference * Math.PI * 2;
    wheels.forEach((w) => {
      w.rotate(BABYLON.Axis.X, wheelRot, BABYLON.Space.LOCAL);
    });

    dist += speed * dt;
    const kmh = speed * 3.6;
    document.getElementById("spd").textContent = kmh.toFixed(0);
    document.getElementById("dist").textContent = dist.toFixed(0);
  });

  return scene;
}

createScene().then((scene) => {
  engine.runRenderLoop(() => {
    scene.render();
  });
});

window.addEventListener("resize", () => {
  engine.resize();
});
