
import * as THREE from "three";

const material = (color, roughness = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness });

const dummy = new THREE.Object3D();

function createInstances(scene, geometry, mat, transforms) {
  if (!transforms.length) return null;

  const mesh = new THREE.InstancedMesh(
    geometry,
    mat,
    transforms.length
  );

  transforms.forEach((transform, index) => {
    dummy.position.set(
      transform.x,
      transform.y,
      transform.z
    );

    dummy.rotation.set(
      transform.rx || 0,
      transform.ry || 0,
      transform.rz || 0
    );

    dummy.scale.set(
      transform.sx || 1,
      transform.sy || 1,
      transform.sz || 1
    );

    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = true;

  scene.add(mesh);
  return mesh;
}

export function createWorld(scene) {
  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    material("#53645a")
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = false;

  scene.add(ground);

  // Materials
  const roadMat = material("#252b30");
  const sidewalkMat = material("#92999a");
  const lineMat = material("#d6c78d");

  const roadWidth = 18;
  const block = 58;
  const extent = 290;

  // Road and sidewalk instances
  const roads = [];
  const sidewalks = [];
  const roadLinesVertical = [];
  const roadLinesHorizontal = [];

  for (let i = -5; i <= 5; i++) {
    const p = i * block;

    roads.push({
      x: p,
      y: 0,
      z: 0,
      rx: -Math.PI / 2,
      sx: roadWidth,
      sy: extent * 2
    });

    roads.push({
      x: 0,
      y: 0.005,
      z: p,
      rx: -Math.PI / 2,
      sx: extent * 2,
      sy: roadWidth
    });

    for (const side of [-1, 1]) {
      sidewalks.push({
        x: p + side * 10.5,
        y: 0.02,
        z: 0,
        rx: -Math.PI / 2,
        sx: 3,
        sy: extent * 2
      });

      sidewalks.push({
        x: 0,
        y: 0.02,
        z: p + side * 10.5,
        rx: -Math.PI / 2,
        sx: extent * 2,
        sy: 3
      });
    }

    for (let z = -extent; z < extent; z += 16) {
      roadLinesVertical.push({
        x: p,
        y: 0.035,
        z,
        rx: -Math.PI / 2
      });

      roadLinesHorizontal.push({
        x: z,
        y: 0.035,
        z: p,
        rx: -Math.PI / 2
      });
    }
  }

  const roadGeometry = new THREE.PlaneGeometry(1, 1);

  createInstances(
    scene,
    roadGeometry,
    roadMat,
    roads
  );

  createInstances(
    scene,
    roadGeometry,
    sidewalkMat,
    sidewalks
  );

  createInstances(
    scene,
    new THREE.PlaneGeometry(0.22, 6),
    lineMat,
    roadLinesVertical
  );

  createInstances(
    scene,
    new THREE.PlaneGeometry(6, 0.22),
    lineMat,
    roadLinesHorizontal
  );

  // Buildings
  const buildingColors = [
    "#78838b",
    "#9b8d7c",
    "#65747b",
    "#a9a49a",
    "#59676d",
    "#b5a58e"
  ];

  const buildingMaterials = buildingColors.map(color =>
    material(color)
  );

  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);

  const roofGeometry = new THREE.BoxGeometry(1, 1, 1);
  const roofMaterial = material("#3b454a");

  const buildings = [];
  const roofs = [];
  const windows = [];

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: "#9cc5ce",
    metalness: 0.15,
    roughness: 0.35,
    emissive: "#243b43",
    emissiveIntensity: 0.2
  });

  const windowGeometry = new THREE.PlaneGeometry(1.4, 1.5);

  for (let gx = -5; gx < 5; gx++) {
    for (let gz = -5; gz < 5; gz++) {
      if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) {
        continue;
      }

      const cx = gx * block + block / 2;
      const cz = gz * block + block / 2;

      const count = 1 + Math.floor(Math.random() * 2);

      for (let b = 0; b < count; b++) {
        const w = 12 + Math.random() * 18;
        const d = 12 + Math.random() * 18;
        const h = 12 + Math.random() * 65;

        const x = cx + (Math.random() - 0.5) * 25;
        const z = cz + (Math.random() - 0.5) * 25;

        const colorIndex = Math.floor(
          Math.random() * buildingMaterials.length
        );

        buildings.push({
          x,
          y: h / 2,
          z,
          sx: w,
          sy: h,
          sz: d,
          materialIndex: colorIndex
        });

        roofs.push({
          x,
          y: h + 0.25,
          z,
          sx: w + 0.5,
          sy: 0.5,
          sz: d + 0.5
        });

        // Front-facing windows, combined into one InstancedMesh.
        for (let y = 4; y < h - 2; y += 4) {
          for (let xx = -w / 2 + 2; xx < w / 2 - 1; xx += 4) {
            windows.push({
              x: x + xx,
              y,
              z: z + d / 2 + 0.025
            });
          }
        }
      }
    }
  }

  // Group buildings by material
  for (let i = 0; i < buildingMaterials.length; i++) {
    const group = buildings.filter(
      building => building.materialIndex === i
    );

    createInstances(
      scene,
      buildingGeometry,
      buildingMaterials[i],
      group
    );
  }

  createInstances(
    scene,
    roofGeometry,
    roofMaterial,
    roofs
  );

  createInstances(
    scene,
    windowGeometry,
    windowMaterial,
    windows
  );

  // Central plaza
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.25, 34),
    material("#a9aaa1")
  );

  plaza.position.set(0, 0.08, 0);
  scene.add(plaza);

  // Fountain
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 0.8, 16),
    material("#657e83")
  );

  fountain.position.set(0, 0.6, 0);
  scene.add(fountain);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.15, 16),
    new THREE.MeshStandardMaterial({
      color: "#4e9eae",
      metalness: 0.2,
      roughness: 0.4
    })
  );

  water.position.set(0, 1.08, 0);
  scene.add(water);

  // Street lamps: use instances instead of 121 individual lights.
  const lampPositions = [];

  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      const px = x * block + 13;
      const pz = z * block + 13;

      lampPositions.push({
        x: px,
        y: 3,
        z: pz
      });
    }
  }

  const lampMaterial = material("#30383b");

  createInstances(
    scene,
    new THREE.CylinderGeometry(0.12, 0.16, 6, 6),
    lampMaterial,
    lampPositions
  );

  // Small glowing lamp heads instead of expensive PointLights.
  const bulbPositions = lampPositions.map(position => ({
    x: position.x,
    y: 5.8,
    z: position.z
  }));

  createInstances(
    scene,
    new THREE.SphereGeometry(0.22, 6, 5),
    new THREE.MeshBasicMaterial({
      color: "#ffd99a"
    }),
    bulbPositions
  );

  return {
    spawn: new THREE.Vector3(0, 0, 32)
  };
}

// Cars
export function createCar(color = "#d35b3f") {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 1.05, 5.2),
    material(color, 0.45)
  );

  body.position.y = 0.85;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 0.95, 2.65),
    new THREE.MeshStandardMaterial({
      color: "#263b46",
      metalness: 0.15,
      roughness: 0.4
    })
  );

  cabin.position.set(0, 1.75, -0.25);
  group.add(cabin);

  const wheelMaterial = material("#111416");

  const wheelGeometry = new THREE.CylinderGeometry(
    0.48,
    0.48,
    0.32,
    10
  );

  for (const x of [-1.58, 1.58]) {
    for (const z of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(
        wheelGeometry,
        wheelMaterial
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.5, z);

      group.add(wheel);
    }
  }

  const lightMaterial = new THREE.MeshBasicMaterial({
    color: "#fff0c2"
  });

  for (const x of [-0.95, 0.95]) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.08),
      lightMaterial
    );

    light.position.set(x, 0.9, 2.65);
    group.add(light);
  }

  return group;
}
