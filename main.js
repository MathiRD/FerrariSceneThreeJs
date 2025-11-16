import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js?module';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js?module';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es';

let scene, camera, renderer, controls;
let pedestal, spotLight;
let world, curtainBody, curtainMesh;
let curtainRemoved = false;
const clock = new THREE.Clock();

init();

function init() {
  console.log("Iniciando cena base Three.js...");
  const canvas = document.querySelector('#three-canvas');

  scene = new THREE.Scene();

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

  // Pedestal (cubo)
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

  // SpotLight apontando para o pedestal
  spotLight = new THREE.SpotLight(0xffffff, 1.6, 60, Math.PI / 5, 0.4, 1);
  spotLight.position.set(-2, 12, 10);
  spotLight.castShadow = true;
  spotLight.target = pedestal;
  scene.add(spotLight);
  scene.add(spotLight.target);

  // Mundo de física cannon-es
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

  // "Cortina" como um cubo que cobre a área do pedestal
  const curtainSize = { x: 4.5, y: 4, z: 8.5 };
  const curtainGeom = new THREE.BoxGeometry(
    curtainSize.x,
    curtainSize.y,
    curtainSize.z
  );

  const curtainTex = texLoader.load(
    './assets/textures/curtain.jpg',
    () => {
      console.log('Textura de cortina carregada.');
      curtainTex.wrapS = THREE.RepeatWrapping;
      curtainTex.wrapT = THREE.RepeatWrapping;
      curtainTex.repeat.set(1, 2);
    },
    undefined,
    () => {
      console.warn('Textura curtain.jpg não encontrada, usando somente cor.');
    }
  );

  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: curtainTex,
    roughness: 0.8,
    side: THREE.DoubleSide
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

  // Clique: remove cortina da cena
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
