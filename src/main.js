
import * as THREE from "three";
import "./style.css";
import { createWorld, createCar } from "./world.js";
import { NetworkClient } from "./network.js";

const root = document.querySelector("#game");
const loading = document.querySelector("#loading");
const startScreen = document.querySelector("#start-screen");
const playButton = document.querySelector("#play");
const nameInput = document.querySelector("#player-name");
const connection = document.querySelector("#connection");
const playerCount = document.querySelector("#player-count");
const toastEl = document.querySelector("#toast");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color("#9ab6c4");
scene.fog = new THREE.Fog("#9ab6c4", 120, 430);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Optimized renderer
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.NoToneMapping;

root.insertBefore(renderer.domElement, root.firstChild);

// Lighting
scene.add(
  new THREE.HemisphereLight("#dcecff", "#53604f", 2)
);

const sun = new THREE.DirectionalLight("#fff1d5", 2.0);
sun.position.set(-100, 150, 80);
sun.castShadow = false;
scene.add(sun);

// World
const { spawn } = createWorld(scene);

// Player
const player = new THREE.Group();

const torso = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.55, 0.9, 5, 10),
  new THREE.MeshStandardMaterial({
    color: "#d9a36f",
    roughness: 0.8
  })
);

torso.position.y = 1.25;
player.add(torso);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.36, 12, 8),
  new THREE.MeshStandardMaterial({
    color: "#c98f65"
  })
);

head.position.y = 2.1;
player.add(head);

const shirt = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 0.7, 0.5),
  new THREE.MeshStandardMaterial({
    color: "#263c53"
  })
);

shirt.position.y = 1.25;
player.add(shirt);

player.position.copy(spawn);
scene.add(player);

// Cars
const cars = [];

const carSpots = [
  [-13, 0, 32],
  [18, 0, -32],
  [95, 0, 90],
  [-90, 0, -90],
  [150, 0, -145]
];

const carColors = [
  "#d35b3f",
  "#3f82b9",
  "#d4b14e",
  "#4c9878",
  "#777b86"
];

carSpots.forEach((position, index) => {
  const car = createCar(carColors[index]);

  car.position.set(...position);
  car.rotation.y = index % 2 ? Math.PI / 2 : 0;

  scene.add(car);
  cars.push(car);
});

// Game state
let activeCar = null;
let carSpeed = 0;

let yaw = 0;
let pitch = 0.18;
const cameraDistance = 9;

const keys = {};

let pointerDown = false;
let lastPointer = { x: 0, y: 0 };
let started = false;

const remoteMeshes = new Map();
const clock = new THREE.Clock();

let toastTimer;

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2400);
}

// Remote players
function makeRemote() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.55, 0.9, 5, 10),
    new THREE.MeshStandardMaterial({
      color: "#54b9b1"
    })
  );

  body.position.y = 1.25;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 10, 8),
    new THREE.MeshStandardMaterial({
      color: "#bd8b69"
    })
  );

  head.position.y = 2.1;
  group.add(head);

  return group;
}

// Multiplayer
const network = new NetworkClient(
  (players) => {
    const alive = new Set();

    for (const data of players) {
      alive.add(data.id);

      let mesh = remoteMeshes.get(data.id);

      if (!mesh) {
        mesh = makeRemote();
        scene.add(mesh);
        remoteMeshes.set(data.id, mesh);
      }

      mesh.position.set(
        data.x || 0,
        0,
        data.z || 0
      );

      mesh.rotation.y = data.rotation || 0;
    }

    for (const [id, mesh] of remoteMeshes) {
      if (!alive.has(id)) {
        scene.remove(mesh);
        remoteMeshes.delete(id);
      }
    }

    playerCount.textContent = String(
      remoteMeshes.size + 1
    );
  },

  (status) => {
    connection.classList.toggle(
      "online",
      status === "online"
    );

    connection.innerHTML =
      `<i></i> ${status === "online" ? "ONLINE" : "OFFLINE"}`;

    if (status === "online") {
      toast("Connected to multiplayer room");
    } else {
      toast("Multiplayer offline — local free roam still works");
    }
  }
);

// Start game
function enterGame() {
  if (started) return;

  started = true;

  const name = (
    nameInput.value.trim() || "Player"
  ).slice(0, 18);

  network.connect(name);

  startScreen.style.display = "none";

  toast("Explore the city. Find a car.");
}

playButton.addEventListener("click", enterGame);

nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    enterGame();
  }
});

// Keyboard
window.addEventListener("keydown", (event) => {
  keys[event.code] = true;

  if (
    ["Space", "ArrowUp", "ArrowDown"].includes(event.code)
  ) {
    event.preventDefault();
  }

  if (event.code === "KeyE" && started) {
    toggleCar();
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

// Camera controls
renderer.domElement.addEventListener("pointerdown", (event) => {
  pointerDown = true;

  lastPointer = {
    x: event.clientX,
    y: event.clientY
  };
});

window.addEventListener("pointerup", () => {
  pointerDown = false;
});

window.addEventListener("pointermove", (event) => {
  if (!pointerDown || !started) return;

  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;

  lastPointer = {
    x: event.clientX,
    y: event.clientY
  };

  yaw -= dx * 0.004;

  pitch = THREE.MathUtils.clamp(
    pitch + dy * 0.003,
    -0.15,
    0.8
  );
});

// Enter and exit vehicles
function toggleCar() {
  if (activeCar) {
    player.position.copy(activeCar.position);

    player.position.x +=
      Math.sin(activeCar.rotation.y) * -4;

    player.position.z +=
      Math.cos(activeCar.rotation.y) * -4;

    activeCar = null;
    carSpeed = 0;

    player.visible = true;

    toast("You left the vehicle");
    return;
  }

  let nearest = null;
  let distance = 6;

  for (const car of cars) {
    const currentDistance =
      car.position.distanceTo(player.position);

    if (currentDistance < distance) {
      distance = currentDistance;
      nearest = car;
    }
  }

  if (nearest) {
    activeCar = nearest;
    player.visible = false;

    toast("Vehicle entered — WASD to drive");
  } else {
    toast("Move closer to a car to enter");
  }
}

// Game update
function update(dt) {
  if (!started) return;

  const forward =
    (keys.KeyW || keys.ArrowUp ? 1 : 0) -
    (keys.KeyS || keys.ArrowDown ? 1 : 0);

  const side =
    (keys.KeyD || keys.ArrowRight ? 1 : 0) -
    (keys.KeyA || keys.ArrowLeft ? 1 : 0);

  if (activeCar) {
    carSpeed += forward * 22 * dt;

    carSpeed *= Math.pow(0.975, dt * 60);

    carSpeed = THREE.MathUtils.clamp(
      carSpeed,
      -10,
      25
    );

    activeCar.rotation.y -=
      side *
      dt *
      (0.7 + Math.abs(carSpeed) * 0.035) *
      (carSpeed < 0 ? -1 : 1);

    activeCar.translateZ(-carSpeed * dt);

    activeCar.position.x = THREE.MathUtils.clamp(
      activeCar.position.x,
      -310,
      310
    );

    activeCar.position.z = THREE.MathUtils.clamp(
      activeCar.position.z,
      -310,
      310
    );

    player.position.copy(activeCar.position);
  } else {
    const moving = forward !== 0 || side !== 0;

    if (moving) {
      const speed =
        keys.ShiftLeft || keys.ShiftRight ? 17 : 9;

      const direction = new THREE.Vector3(
        Math.sin(yaw),
        0,
        -Math.cos(yaw)
      );

      const right = new THREE.Vector3(
        Math.cos(yaw),
        0,
        Math.sin(yaw)
      );

      const velocity = direction
        .multiplyScalar(forward)
        .add(right.multiplyScalar(side))
        .normalize()
        .multiplyScalar(speed * dt);

      player.position.add(velocity);

      player.rotation.y = Math.atan2(
        velocity.x,
        velocity.z
      );
    }

    if (keys.Space && player.position.y < 0.03) {
      player.userData.jump = 7;
    }

    if (player.userData.jump) {
      player.position.y +=
        player.userData.jump * dt;

      player.userData.jump -= 22 * dt;

      if (player.position.y < 0) {
        player.position.y = 0;
        player.userData.jump = 0;
      }
    }

    player.position.x = THREE.MathUtils.clamp(
      player.position.x,
      -310,
      310
    );

    player.position.z = THREE.MathUtils.clamp(
      player.position.z,
      -310,
      310
    );
  }

  // Camera
  const target = activeCar
    ? activeCar.position
    : player.position;

  const focus = target.clone().add(
    new THREE.Vector3(0, 1.3, 0)
  );

  const horizontal =
    cameraDistance * Math.cos(pitch);

  const offset = new THREE.Vector3(
    Math.sin(yaw) * horizontal,
    3 + Math.sin(pitch) * cameraDistance,
    Math.cos(yaw) * horizontal
  );

  camera.position.lerp(
    focus.clone().add(offset),
    1 - Math.pow(0.001, dt)
  );

  camera.lookAt(focus);

  // Multiplayer position update
  network.sendPosition(
    target,
    activeCar
      ? activeCar.rotation.y
      : player.rotation.y,
    !!activeCar,
    nameInput.value.trim() || "Player"
  );
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);

  update(dt);

  renderer.render(scene, camera);
}

animate();

loading.style.display = "none";

// Resize
window.addEventListener("resize", () => {
  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.25)
  );
});

// Cleanup
window.addEventListener("beforeunload", () => {
  network.close();
});
