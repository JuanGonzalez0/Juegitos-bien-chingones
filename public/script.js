const socket = io();

// Configuración básica de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Crear el fondo
const loader = new THREE.CubeTextureLoader();
const texture = loader.load([
    'textures/px.jpg', // derecha
    'textures/nx.jpg', // izquierda
    'textures/py.jpg', // arriba
    'textures/ny.jpg', // abajo
    'textures/pz.jpg', // adelante
    'textures/nz.jpg'  // atrás
]);
scene.background = texture;

// Crear el césped
const grassGeometry = new THREE.PlaneGeometry(50, 50);
const grassMaterial = new THREE.MeshBasicMaterial({ color: 0x87cefa });
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.rotation.x = -Math.PI / 2;
scene.add(grass);

// Función para crear árboles
function createTree(x, z) {
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2);
    const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 1, z);

    const leavesGeometry = new THREE.SphereGeometry(1);
    const leavesMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(x, 2.5, z);

    scene.add(trunk);
    scene.add(leaves);
}

// Crear varios árboles en posiciones aleatorias
for (let i = 0; i < 10; i++) {
    const x = Math.random() * 20 - 10;
    const z = Math.random() * 20 - 10;
    createTree(x, z);
}

// Diccionario para los cubos y etiquetas
const cubes = {};
const labels = {};

// Crear cubo y agregarlo a la escena
function createCube(id, position, name) {
    // Cargar la textura
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('textures/texture.jpg'); // Ruta a la textura

    // Crear el material con la textura
    const material = new THREE.MeshBasicMaterial({ map: texture });

    // Crear el cubo
    const geometry = new THREE.BoxGeometry();
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(position.x, position.y + 1, position.z); // Ajustar altura
    scene.add(cube);
    cubes[id] = cube;

    // Crear y agregar la etiqueta
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        const textGeometry = new THREE.TextGeometry(name, {
            font: font,
            size: 0.5,
            height: 0.1,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(position.x, position.y + 2, position.z); // Ajustar altura
        scene.add(textMesh);
        labels[id] = textMesh;
    });

    return cube;
}

// Chat
const chat = document.getElementById('chat');
const messageInput = document.getElementById('messageInput');

// Mostrar un mensaje en el chat
function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight; // Desplaza hacia abajo
}

// Enviar mensaje al presionar Enter
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && messageInput.value.trim() !== '') {
        socket.emit('chatMessage', messageInput.value);
        messageInput.value = ''; // Limpiar input después de enviar
    }
});

// Recibir y mostrar mensajes del chat
socket.on('chatMessage', (message) => {
    addMessage(message);
});

// Solicitar nombre del jugador al ingresar
const namePrompt = document.getElementById('namePrompt');
const nameInput = document.getElementById('nameInput');
const joinButton = document.getElementById('joinButton');

joinButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
        socket.emit('newPlayer', { name: name });
        namePrompt.style.display = 'none'; // Ocultar pantalla de nombre
    }
});

// Mover el cubo con las teclas de flecha
function moveCube(cube, direction) {
    const speed = 0.5;
    const groundLevel = 0; // Nivel del césped

    if (direction === 'ArrowUp') cube.position.z -= speed;
    if (direction === 'ArrowDown') cube.position.z += speed;
    if (direction === 'ArrowLeft') cube.position.x -= speed;
    if (direction === 'ArrowRight') cube.position.x += speed;

    // Evitar que el cubo atraviese el suelo
    if (cube.position.y < groundLevel) {
        cube.position.y = groundLevel;
    }
}

// Actualizar la posición de la cámara para vista en tercera persona
function updateCamera(cube) {
    const offset = 10; // Distancia de la cámara detrás del cubo
    camera.position.set(cube.position.x, cube.position.y + 5, cube.position.z + offset);
    camera.lookAt(cube.position);
}

// Recibir posición inicial
socket.on('init', ({ id, position, name }) => {
    createCube(id, position, name);

    // Manejar los eventos del teclado
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            moveCube(cubes[socket.id], event.key);
            socket.emit('move', { x: cubes[socket.id].position.x, y: cubes[socket.id].position.y, z: cubes[socket.id].position.z });
            // Actualizar la posición de la etiqueta del jugador actual
            if (labels[socket.id]) {
                labels[socket.id].position.set(cubes[socket.id].position.x, cubes[socket.id].position.y + 2, cubes[socket.id].position.z);
            }
        }
    });
});

// Manejar la llegada de nuevos jugadores
socket.on('newPlayer', ({ id, position, name }) => {
    createCube(id, position, name);
});

// Manejar la lista de todos los jugadores
socket.on('allPlayers', (players) => {
    for (const id in players) {
        if (id !== socket.id) { // Evitar duplicado del jugador actual
            createCube(id, players[id].position, players[id].name);
        }
    }
});

// Mover cubos de otros usuarios
socket.on('move', ({ id, position }) => {
    if (cubes[id]) {
        cubes[id].position.set(position.x, position.y, position.z);
        if (labels[id]) {
            labels[id].position.set(position.x, position.y + 2, position.z);
        }
    }
});

// Remover el cubo de un usuario desconectado
socket.on('removeCube', (id) => {
    if (cubes[id]) {
        scene.remove(cubes[id]);
        if (labels[id]) {
            scene.remove(labels[id]);
        }
        delete cubes[id];
        delete labels[id];
    }
});

// Configuración de la cámara
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

// Iluminación (opcional)
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Animación
function animate() {
    requestAnimationFrame(animate);
    if (cubes[socket.id]) {
        updateCamera(cubes[socket.id]);
    }
    renderer.render(scene, camera);
}
animate();
