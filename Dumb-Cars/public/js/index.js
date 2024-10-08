import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { World, Body, Box, Plane, Sphere, Vec3, PointToPointConstraint, Material } from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
const socket = io('http://localhost:3000');
  


// Configuración de la escena de Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x87CEEB);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Añadiendo una luz
const light = new THREE.DirectionalLight(0xffffff, 0.7);
light.position.set(10, 10, 10);
scene.add(light);

// Configuración del mundo físico de Cannon.js
const world = new World();
world.gravity.set(0, -9.82, 0); // Gravedad


// Crear el coche
const carGeometry = new THREE.BoxGeometry(3, 3, 3);



// Crear el video para la textura
const video = document.createElement('video');
video.autoplay = true;
video.playsInline = true;
video.width = 640; // Ajusta el tamaño según sea necesario
video.height = 480;

const canvas = document.createElement('canvas');
canvas.width = video.width;
canvas.height = video.height;
const context = canvas.getContext('2d');

// Asegúrate de que la textura se cree correctamente
const videoTexture = new THREE.CanvasTexture(canvas);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBAFormat; // Usa RGBAFormat para evitar problemas con el formato

const carMaterial = new THREE.MeshStandardMaterial({ map: videoTexture });
const carMesh = new THREE.Mesh(carGeometry, carMaterial);
scene.add(carMesh);

const carShape = new Box(new Vec3(1, 0.5, 2)); // Tamaño de la mitad del coche
const carBody = new Body({ mass: 1, position: new Vec3(0, 0.5, 0), shape: carShape });
world.addBody(carBody);

// Crear el suelo
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
scene.add(groundMesh);

const groundShape = new Plane();
const groundBody = new Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

let playerCubes = {};

// Enviar la posición del coche del jugador al servidor
function sendCarUpdate() {
    const carPosition = {
      x: carBody.position.x,
      y: carBody.position.y,
      z: carBody.position.z
    };
    socket.emit('updateCar', carPosition);
  }
  
  // Escuchar actualizaciones de otros jugadores
  socket.on('playerData', (players) => {
    // Elimina los cubos de jugadores que ya no están en la partida
    for (let id in playerCubes) {
      if (!players[id]) {
        scene.remove(playerCubes[id]);
        playerCubes[id].geometry.dispose();
        playerCubes[id].material.dispose();
        delete playerCubes[id];
      }
    }
  
    // Agrega o actualiza los cubos de los jugadores
    for (let id in players) {
      const player = players[id];
      if (playerCubes[id]) {
        // Actualiza la posición del cubo existente
        playerCubes[id].position.set(player.x, player.y, player.z);
      } else {
        // Crea un nuevo cubo para el jugador
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(player.x, player.y, player.z);
        scene.add(cube);
        playerCubes[id] = cube;
      }
    }
  });

// Crear edificios
function createBuilding(x, z) {
    const buildingGeometry = new THREE.BoxGeometry(3, 10, 3);
    const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
    buildingMesh.position.set(x, 5, z);
    scene.add(buildingMesh);

    const buildingShape = new Box(new Vec3(1.5, 5, 1.5));
    const buildingBody = new Body({ mass: 0 });
    buildingBody.addShape(buildingShape);
    buildingBody.position.set(x, 5, z);
    world.addBody(buildingBody);
}
function createWheel(x, y, z) {
const wheelRadius = 1; // Radio de la rueda
const wheelGeometry = new THREE.SphereGeometry(wheelRadius, 10, 10);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
wheelMesh.position.set(x, y, z);
scene.add(wheelMesh);

const wheelShape = new Sphere(wheelRadius); // Usa Sphere aquí
const wheelBody = new Body({
mass: 1,
position: new Vec3(x, y, z),
shape: wheelShape
});
world.addBody(wheelBody);

return { wheelMesh, wheelBody };
}


const wheelOffsetX = 3; // Ajusta según el tamaño del cubo
const wheelOffsetZ = 3; // Ajusta según el tamaño del cubo
const wheelY = -1;         // Altura de las ruedas desde el suelo

const frontLeftWheel = createWheel(-wheelOffsetX, wheelY, wheelOffsetZ);
const frontRightWheel = createWheel(-wheelOffsetX, wheelY, -wheelOffsetZ);
const backLeftWheel = createWheel(wheelOffsetX, wheelY, wheelOffsetZ);
const backRightWheel = createWheel(wheelOffsetX, wheelY, -wheelOffsetZ);



function createWheelConstraints() {
const wheelConstraints = [
new PointToPointConstraint(carBody, new Vec3(-wheelOffsetX, wheelY, wheelOffsetZ), frontLeftWheel.wheelBody, new Vec3(0, 0, 0)),
new PointToPointConstraint(carBody, new Vec3(-wheelOffsetX, wheelY, -wheelOffsetZ), frontRightWheel.wheelBody, new Vec3(0, 0, 0)),
new PointToPointConstraint(carBody, new Vec3(wheelOffsetX, wheelY, wheelOffsetZ), backLeftWheel.wheelBody, new Vec3(0, 0, 0)),
new PointToPointConstraint(carBody, new Vec3(wheelOffsetX, wheelY, -wheelOffsetZ), backRightWheel.wheelBody, new Vec3(0, 0, 0))
];

wheelConstraints.forEach(constraint => world.addConstraint(constraint));
}
createWheelConstraints();


createBuilding(10, 10);
createBuilding(-10, -10);
createBuilding(15, -5);

// Manejar el menú de selección de cámaras
async function initializeCameraSelection() {
const select = document.getElementById('cameraSelect');
try {
const devices = await navigator.mediaDevices.enumerateDevices();
const videoDevices = devices.filter(device => device.kind === 'videoinput');

if (videoDevices.length === 0) {
    console.warn('No cameras found. Using default texture.');
    loadDefaultTexture();  // Carga la textura predeterminada si no hay cámaras
    return;
}

videoDevices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label || `Camera ${select.options.length + 1}`;
    select.appendChild(option);
});

select.addEventListener('change', (event) => {
    const deviceId = event.target.value;
    startVideo(deviceId);
});

// Iniciar la primera cámara por defecto
select.value = videoDevices[0].deviceId;
startVideo(videoDevices[0].deviceId);
} catch (error) {
console.error('Error initializing camera selection:', error);
alert('Failed to initialize camera selection. Using default texture.');
loadDefaultTexture();  // Carga la textura predeterminada en caso de error
}
}

async function startVideo(deviceId) {
try {
const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: deviceId ? { exact: deviceId } : undefined }
});
video.srcObject = stream;
video.play();
video.addEventListener('loadeddata', () => {
    // Solo iniciar el juego después de que el video esté listo
    animate();
});
} catch (error) {
console.error('Error accessing the camera:', error);
alert('Error accessing the camera. Using default texture.');
loadDefaultTexture();  // Carga la textura predeterminada en caso de error
}
}

function loadDefaultTexture() {
const defaultTextureUrl = 'texture1.png'; // O 'texture2.png', el que prefieras como predeterminado
const loader = new THREE.TextureLoader();
loader.load(defaultTextureUrl, (texture) => {
carMaterial.map = texture;
carMaterial.needsUpdate = true;

// Asegúrate de que el juego se inicie después de cargar la textura
animate();
});
}

// Configuración inicial y manejo de errores
window.addEventListener('load', () => {
initializeCameraSelection();
});

// Configuración del joystick
const joystick = nipplejs.create({
    zone: document.getElementById('joystick'),
    color: 'blue',
    size: 100,
    position: { top: '0%', left: '0%' }
});

let movement = { x: 0, y: 0 };

joystick.on('move', (event, data) => {
    if (data.direction) {
        movement.x = data.vector.x;
        movement.y = data.vector.y;
    }
});

joystick.on('end', () => {
    movement.x = 0;
    movement.y = 0;
});

// Actualización del movimiento del coche
function updateCarMovement() {
const forwardForce = 0.5; // Fuerza aplicada hacia adelante/atrás
const turnForce = 0.5;  // Fuerza de rotación

if (movement.y > 0) { // Movimiento hacia adelante
const forward = new Vec3(
    Math.sin(carBody.quaternion.y) * forwardForce * movement.y,
    0,
    -Math.cos(carBody.quaternion.y) * forwardForce * movement.y
);
carBody.velocity.vadd(forward, carBody.velocity);
} else if (movement.y < 0) { // Movimiento hacia atrás
const backward = new Vec3(
    -Math.sin(carBody.quaternion.y) * -movement.y * forwardForce,
    0,
    Math.cos(carBody.quaternion.y) * -movement.y * forwardForce
);
carBody.velocity.vadd(backward, carBody.velocity);
}

if (movement.x !== 0) { // Rotación
carBody.angularVelocity.set(0, -movement.x * turnForce, 0);
}
}


function updateCameraPosition() {
    const relativeCameraOffset = new THREE.Vector3(0, 5, -distance);
    const cameraOffset = relativeCameraOffset.applyMatrix4(carMesh.matrixWorld);

    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(carMesh.position);
}

let distance = 10; // Distancia inicial de la cámara al coche

// Manejador de eventos para la rueda del mouse
window.addEventListener('wheel', (event) => {
    distance -= event.deltaY * 0.1; // Ajusta la sensibilidad si es necesario
    distance = Math.max(1, Math.min(50, distance)); // Limita la distancia de la cámara
});
function limitCarPosition() {
    const minX = -250;  // Límite mínimo en el eje X
    const maxX = 250;   // Límite máximo en el eje X
    const minZ = -250;  // Límite mínimo en el eje Z
    const maxZ = 250;   // Límite máximo en el eje Z

    // Limitar la posición en el mundo físico
    if (carBody.position.x < minX) carBody.position.x = minX;
    if (carBody.position.x > maxX) carBody.position.x = maxX;
    if (carBody.position.z < minZ) carBody.position.z = minZ;
    if (carBody.position.z > maxZ) carBody.position.z = maxZ;
}
const textureSelect = document.getElementById('textureSelect');
textureSelect.addEventListener('change', (event) => {
const textureUrl = event.target.value;
const loader = new THREE.TextureLoader();
loader.load(textureUrl, (texture) => {
    carMaterial.map = texture;
    carMaterial.needsUpdate = true;
});
});
// Animación y renderizado
function animate() {
    requestAnimationFrame(animate);

    // Actualizar física
    updateCarMovement();
    world.step(1 / 60);

    limitCarPosition();

// Sincronizar la posición del coche con su cuerpo físico
carMesh.position.copy(carBody.position);
carMesh.quaternion.copy(carBody.quaternion);

// Actualizar la posición de las ruedas
frontLeftWheel.wheelMesh.position.copy(frontLeftWheel.wheelBody.position);
frontLeftWheel.wheelMesh.quaternion.copy(frontLeftWheel.wheelBody.quaternion);

frontRightWheel.wheelMesh.position.copy(frontRightWheel.wheelBody.position);
frontRightWheel.wheelMesh.quaternion.copy(frontRightWheel.wheelBody.quaternion);

backLeftWheel.wheelMesh.position.copy(backLeftWheel.wheelBody.position);
backLeftWheel.wheelMesh.quaternion.copy(backLeftWheel.wheelBody.quaternion);

backRightWheel.wheelMesh.position.copy(backRightWheel.wheelBody.position);
backRightWheel.wheelMesh.quaternion.copy(backRightWheel.wheelBody.quaternion);

    // Actualizar la textura del video usando el canvas
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        videoTexture.needsUpdate = true;
    }

    // Actualizar la posición de la cámara
    updateCameraPosition();
    sendCarUpdate();
    renderer.render(scene, camera);
}

camera.position.set(0, 10, distance);

// Esperar a que el video esté listo
video.addEventListener('loadeddata', () => {
    animate();
});