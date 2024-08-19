const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

const players = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    // Guardar el nuevo jugador en el servidor
    socket.on('newPlayer', ({ name }) => {
        const startTime = Date.now(); // Guardar el tiempo de conexión
        players[socket.id] = { 
            position: { x: 0, y: 0, z: 0 }, 
            name: name, 
            startTime: startTime, 
            health: 100, 
            kills: 0  // Nuevo campo para almacenar la cantidad de derrotas
        };
        socket.emit('init', { id: socket.id, position: players[socket.id].position, name: name, startTime: startTime });
        socket.broadcast.emit('newPlayer', { id: socket.id, position: players[socket.id].position, name: name });
        socket.emit('allPlayers', players); // Emitir el estado completo de todos los jugadores al nuevo jugador
    });

    // Manejar movimiento del cubo
    socket.on('move', (position) => {
        if (players[socket.id]) {
            players[socket.id].position = position;
            socket.broadcast.emit('move', { id: socket.id, position: position });
        }
    });

    // Manejar mensajes de chat
    socket.on('chatMessage', (message) => {
        const playerName = players[socket.id] ? players[socket.id].name : 'Anonymous';
        const formattedMessage = `${playerName}: ${message}`;
        io.emit('chatMessage', formattedMessage); // Enviar mensaje a todos
    });

    // Manejar ataques
    socket.on('attack', () => {
        const attacker = players[socket.id];
        if (attacker) {
            for (const id in players) {
                if (id !== socket.id) {
                    const defender = players[id];
                    // Verificar si el atacante está en el rango del defensor
                    const distance = Math.sqrt(
                        Math.pow(attacker.position.x - defender.position.x, 2) +
                        Math.pow(attacker.position.z - defender.position.z, 2)
                    );
                    if (distance < 2) { // Rango de ataque
                        defender.health -= 10; // Reducir la salud del defensor
                        io.to(id).emit('updateHealth', { id: id, health: defender.health }); // Actualizar al defensor
                        socket.emit('updateHealth', { id: id, health: defender.health }); // Actualizar al atacante también
                        if (defender.health <= 0) {
                            attacker.kills += 1; // Incrementar el contador de derrotas del atacante
                            
                            // Notificar al defensor de su derrota y cuántos jugadores derrotó el atacante
                            io.to(id).emit('defeated', { 
                                timeSurvived: Math.floor((Date.now() - defender.startTime) / 1000), 
                                kills: attacker.kills // Enviar el número de derrotas al cliente derrotado
                            });
                            
                            // Notificar al atacante sobre su propio número de derrotas
                            socket.emit('updateKills', { kills: attacker.kills });

                            io.emit('removePlayer', id); // Eliminar jugador de la escena
                            delete players[id]; // Eliminar jugador del servidor
                        }
                        break; // Solo un ataque por acción
                    }
                }
            }
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
