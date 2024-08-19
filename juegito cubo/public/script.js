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

// Crear el cuadrilátero con cuerdas

// Crear la base del cuadrilátero
const quadGeometry = new THREE.PlaneGeometry(65, 65); // Tamaño del cuadrilátero
const quadMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 }); // Color gris
const quad = new THREE.Mesh(quadGeometry, quadMaterial);
quad.rotation.x = -Math.PI / 2; // Asegurar que esté en horizontal
scene.add(quad);

// Crear una función para crear cuerdas
const createLine = (start, end, color) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: color });
    return new THREE.Line(geometry, material);
};

const ropeLength = 65; // Longitud del cuadrilátero
const numLayers = 5; // Número de capas de cuerdas
const offset = 1; // Espaciado entre las capas de cuerdas

// Crear cuerdas en los bordes con superposiciones
for (let i = 0; i < numLayers; i++) {
    const layerOffset = i * offset;

    // Cuerdas superiores
    scene.add(createLine(
        new THREE.Vector3(-ropeLength / 2, layerOffset, -ropeLength / 2),
        new THREE.Vector3(ropeLength / 2, layerOffset, -ropeLength / 2),
        0xff0000
    ));
    // Cuerdas derechas
    scene.add(createLine(
        new THREE.Vector3(ropeLength / 2, layerOffset, -ropeLength / 2),
        new THREE.Vector3(ropeLength / 2, layerOffset, ropeLength / 2),
        0xff0000
    ));
    // Cuerdas inferiores
    scene.add(createLine(
        new THREE.Vector3(ropeLength / 2, layerOffset, ropeLength / 2),
        new THREE.Vector3(-ropeLength / 2, layerOffset, ropeLength / 2),
        0xff0000
    ));
    // Cuerdas izquierdas
    scene.add(createLine(
        new THREE.Vector3(-ropeLength / 2, layerOffset, ropeLength / 2),
        new THREE.Vector3(-ropeLength / 2, layerOffset, -ropeLength / 2),
        0xff0000
    ));
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

// Variable para almacenar el tiempo de conexión
let startTime;

// Mostrar el tiempo en la interfaz
function updateTimer() {
    if (startTime) {
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000); // Tiempo en segundos
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        document.getElementById('timer').textContent = `Tiempo en partida: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
}

// Recibir posición inicial
socket.on('init', ({ id, position, name, startTime: serverStartTime }) => {
    createCube(id, position, name);
    startTime = serverStartTime; // Guardar el tiempo de conexión
    setInterval(updateTimer, 1000); // Actualizar el temporizador cada segundo

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


let health = 100; // Salud del jugador

// Crear las barras de salud
function createHealthBars(id) {
    // Crear barra azul solo para el jugador actual
    if (id === socket.id) {
        const blueBarContainer = document.createElement('div');
        blueBarContainer.className = 'health-bar-container';
        blueBarContainer.id = `healthBarBlueContainer-${id}`;
        blueBarContainer.style.position = 'fixed'; // Fija la posición en la pantalla
        blueBarContainer.style.bottom = '10px'; // Ajustar según la posición deseada
        blueBarContainer.style.right = '10px'; // Ajustar según la posición deseada

        const blueBar = document.createElement('div');
        blueBar.className = 'health-bar';
        blueBar.id = `healthBarBlue-${id}`;
        blueBar.style.width = '100%'; // Inicialmente lleno
        blueBar.style.backgroundColor = 'blue'; // Color azul para el jugador actual

        blueBarContainer.appendChild(blueBar);
        document.body.appendChild(blueBarContainer); // Añadir a body o contenedor específico
    }
}

// Actualizar la barra de salud azul
function updateHealthBars(id, health) {
    const blueHealthBar = document.getElementById(`healthBarBlue-${id}`);
    if (blueHealthBar) {
        blueHealthBar.style.width = `${health}%`;
        blueHealthBar.style.backgroundColor = 'blue';
    }
}

// Crear etiqueta de nombre
function createLabel(id, name, position) {
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        const textGeometry = new THREE.TextGeometry(name, {
            font: font,
            size: 0.5,
            height: 0.1,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(position.x, position.y + 2, position.z);
        scene.add(textMesh);
        labels[id] = textMesh; // Guardar la nueva etiqueta
    });
}

function updateLabel(id, name, position) {
    if (labels[id]) {
        scene.remove(labels[id]); // Eliminar etiqueta existente
        delete labels[id];
        createLabel(id, name, position); // Crear la nueva etiqueta
    }
}

// Enviar ataque al servidor cuando se presiona la tecla 'z'
document.addEventListener('keydown', (event) => {
    if (event.key === 'z') {
        socket.emit('attack');
    }
});

// Mostrar la cantidad de derrotas para el atacante
socket.on('updateKills', ({ kills }) => {
    // Puedes mostrar las derrotas del atacante en algún elemento de la interfaz del juego
    document.getElementById('killsDisplay').innerText = `Kills: ${kills}`;
});

// Mostrar pantalla de derrota
socket.on('defeated', ({ timeSurvived, kills }) => {
    document.body.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px;">
        <h2>Game Over</h2>
        <p>You survived for ${Math.floor(timeSurvived / 60)}:${timeSurvived % 60 < 10 ? '0' : ''}${timeSurvived % 60}</p>
        <p>Your opponent defeated ${kills} player(s)</p>
        <button onclick="window.location.reload();">Play Again</button>
    </div>`;
});


// Inicializar el jugador
socket.on('init', ({ id, position, name, startTime }) => {
    createHealthBars(id);
    createLabel(id, name, position); // Crear etiqueta de nombre
    updateHealthBars(id, 100); // Inicializar la barra de salud con 100%
});

// Actualizar la salud de los jugadores
socket.on('updateHealth', ({ id, health }) => {
    updateHealthBars(id, health);
});

// Manejar la llegada de nuevos jugadores
socket.on('newPlayer', ({ id, position, name }) => {
    createHealthBars(id);
    createLabel(id, name, position); // Crear etiqueta de nombre
    updateHealthBars(id, 100); // Inicializar la barra de salud con 100%
    if (!labels[id]) {
        createLabel(id, name, position);
    }
});

// Eliminar el cubo, la barra de salud y la etiqueta del jugador
socket.on('removePlayer', (id) => {
    // Eliminar la barra de salud azul
    const blueHealthBarContainer = document.getElementById(`healthBarBlueContainer-${id}`);
    if (blueHealthBarContainer) {
        blueHealthBarContainer.remove();
    }
    // Eliminar el cubo del jugador
    if (cubes[id]) {
        scene.remove(cubes[id]);
        delete cubes[id];
    }
    // Eliminar la etiqueta del jugador
    if (labels[id]) {
        scene.remove(labels[id]);
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
