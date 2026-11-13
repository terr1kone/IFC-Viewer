import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { IFCLoader } from '/vendor/IFCLoader.js';

const id = window.location.pathname.split('/').filter(Boolean).pop();

const overlay = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlayMsg');
const titleEl = document.getElementById('title');

function showError(msg) {
  overlay.classList.add('err');
  document.getElementById('spinner').style.display = 'none';
  overlayMsg.textContent = msg;
}

function setProgress(loaded, total) {
  if (total > 0) {
    overlayMsg.textContent = `Loading model… ${(loaded / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB (${Math.round(loaded / total * 100)}%)`;
  }
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
else renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14181d);

scene.add(new THREE.HemisphereLight(0xffffff, 0x30363d, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(50, 100, 30);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

let home = { position: null, target: null };

function fitCameraTo(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const dist = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.8;
  camera.position.set(center.x + dist * 0.7, center.y + dist * 0.55, center.z + dist * 0.7);
  controls.target.copy(center);
  controls.update();
  home = { position: camera.position.clone(), target: controls.target.clone() };
}

async function loadModel() {
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    showError('Invalid model link.');
    return;
  }
  try {
    const res = await fetch('/api/models');
    const data = await res.json();
    const meta = (data.models || []).find(m => m.id === id);
    titleEl.textContent = meta ? meta.name : id;
  } catch {
    titleEl.textContent = id;
  }

  const loader = new IFCLoader();
  loader.ifcManager.setWasmPath('/vendor/wasm/');
  loader.load(
    '/models/' + id,
    (model) => {
      scene.add(model);
      fitCameraTo(model);
      overlay.classList.add('hidden');
    },
    (event) => setProgress(event.loaded, event.total),
    (err) => {
      console.error(err);
      showError('Could not load this model. The link may be invalid or the file deleted.');
    }
  );
}

document.getElementById('resetBtn').addEventListener('click', () => {
  if (home.position) {
    camera.position.copy(home.position);
    controls.target.copy(home.target);
    controls.update();
  }
});

document.getElementById('copyBtn').addEventListener('click', async (e) => {
  await navigator.clipboard.writeText(window.location.href);
  e.target.textContent = 'Copied!';
  setTimeout(() => { e.target.textContent = 'Copy link'; }, 1500);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

loadModel();
animate();
