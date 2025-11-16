import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js?module';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js?module';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js?module';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

let scene, camera, renderer, controls;
let pedestal, spotLight, gltfModel;
let world, curtainBody, curtainMesh;
let curtainRemoved = false;
const clock = new THREE.Clock();

init();

function init() {
  console.log("Iniciando cena Three.js...");
  const canvas = document.querySelector('#three-canvas');

  scene = new THREE.Scene();

  // Loader de texturas
  const texLoader = new THREE.TextureLoader();

  // SKYBOX com textura de céu (equiretangular)
  const skyTexture = texLoader.load(
    './assets/textures/skybox.png',
    () => {
      skyTexture.mapping = THREE.EquirectangularReflectionMapping;
      skyTexture.colorSpace = THREE.SRGBColorSpace;
      scene.background = skyTexture;
      scene.environment = skyTexture;
      console.log('Skybox carregado.');
    },
    undefined,
    (err) => {
      console.warn('Falha ao carregar skybox.png, usando cor sólida.', err);
      scene.background = new THREE.Color(0x20233b);
    }
  );

  // Câmera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(10, 8, 18);

  // Renderizador
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Controles de órbita
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-6, 2, 0);
  controls.update();

  // Luz ambiente
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Piso (floor)
  const floorGeom = new THREE.PlaneGeometry(40, 40);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.9,
    metalness: 0.0
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Pedestal (cubo embaixo do carro)
  const pedestalHeight = 0.8;
  const pedestalGeom = new THREE.BoxGeometry(4, pedestalHeight, 8);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.4,
    metalness: 0.6
  });
  pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
  pedestal.position.set(-6, pedestalHeight / 2, 0);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  // SpotLight apontando para o pedestal / carro
  spotLight = new THREE.SpotLight(0xffffff, 1.6, 60, Math.PI / 5, 0.4, 1);
  spotLight.position.set(-2, 12, 10);
  spotLight.castShadow = true;
  spotLight.target = pedestal;
  scene.add(spotLight);
  scene.add(spotLight.target);

  // Asset GLTF externo (Ferrari F40)
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    './assets/models/scene.gltf',
    (gltf) => {
      console.log('GLTF carregado com sucesso');
      gltfModel = gltf.scene;

      // Converte materiais complicados para MeshStandardMaterial,
      // reaproveitando texturas e cores originais.
      gltfModel.traverse((obj) => {
        if (!obj.isMesh) return;

        const orig = obj.material;
        if (!orig) return;

        const origMats = Array.isArray(orig) ? orig : [orig];
        const newMats = [];

        origMats.forEach((m) => {
          if (!m) return;
          const nm = new THREE.MeshStandardMaterial({
            color: (m.color && m.color.clone()) || new THREE.Color(0xffffff),
            metalness: m.metalness !== undefined ? m.metalness : 0.7,
            roughness: m.roughness !== undefined ? m.roughness : 0.4,
            envMapIntensity: 1.0
          });
          if (m.map) nm.map = m.map;
          if (m.normalMap) nm.normalMap = m.normalMap;
          if (m.roughnessMap) nm.roughnessMap = m.roughnessMap;
          if (m.metalnessMap) nm.metalnessMap = m.metalnessMap;
          if (m.emissive) nm.emissive = m.emissive.clone();
          if (m.emissiveMap) nm.emissiveMap = m.emissiveMap;

          newMats.push(nm);

          // libera material original
          m.dispose?.();
        });

        obj.material = newMats.length === 1 ? newMats[0] : newMats;
        obj.castShadow = true;
        obj.receiveShadow = true;
      });

      // Centraliza o modelo e calcula tamanho para posicionar sobre o pedestal
      const box = new THREE.Box3().setFromObject(gltfModel);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      gltfModel.position.sub(center); // centraliza pivot
      const carY = pedestalHeight + size.y / 2;

      gltfModel.position.x = -6;
      gltfModel.position.y = carY;
      gltfModel.position.z = 0;

      // Escala se for muito grande
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 10) {
        const scaleFactor = 10 / maxDim;
        gltfModel.scale.setScalar(scaleFactor);
      }

      scene.add(gltfModel);
    },
    undefined,
    (error) => {
      console.error('Erro ao carregar GLTF:', error);
    }
  );

  // Mundo de física cannon-es (bônus)
  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
  });

  // Chão físico
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({
    mass: 0,
    shape: groundShape
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // "Cortina" como um cubo que cobre o carro
  const curtainSize = { x: 4.5, y: 4, z: 8.5 };
  const curtainGeom = new THREE.BoxGeometry(
    curtainSize.x,
    curtainSize.y,
    curtainSize.z
  );

  const curtainTex = texLoader.load(
    './assets/textures/curtain.jpg',
    () => console.log('Textura de cortina carregada.'),
    undefined,
    () => console.warn('Falha ao carregar curtain.jpg, usando somente cor.')
  );

  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xaa0000,
    map: curtainTex,
    roughness: 0.8
  });

  curtainMesh = new THREE.Mesh(curtainGeom, curtainMat);
  curtainMesh.castShadow = true;
  curtainMesh.receiveShadow = false;
  const curtainY = pedestalHeight + curtainSize.y / 2 + 0.2;
  curtainMesh.position.set(-6, curtainY, 0);
  scene.add(curtainMesh);

  const curtainShape = new CANNON.Box(
    new CANNON.Vec3(
      curtainSize.x / 2,
      curtainSize.y / 2,
      curtainSize.z / 2
    )
  );
  curtainBody = new CANNON.Body({
    mass: 0,
    shape: curtainShape,
    position: new CANNON.Vec3(-6, curtainY, 0)
  });
  world.addBody(curtainBody);

  // Clique: remove cortina da cena (revelação do carro)
  window.addEventListener('click', () => {
    if (curtainRemoved) return;
    curtainRemoved = true;
    console.log('Removendo cortina da cena e do mundo físico...');
    if (curtainMesh) {
      scene.remove(curtainMesh);
      curtainMesh.geometry.dispose();
      if (curtainMesh.material.map) curtainMesh.material.map.dispose();
      curtainMesh.material.dispose();
      curtainMesh = null;
    }
    if (curtainBody && world) {
      world.removeBody(curtainBody);
      curtainBody = null;
    }
  });

  window.addEventListener('resize', onWindowResize);

  animate();
}

function update(delta) {
  if (world) {
    world.step(1 / 60, delta, 3);
  }

  if (gltfModel) {
    gltfModel.rotation.y += delta * 0.4;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  update(delta);
  renderer.render(scene, camera);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
