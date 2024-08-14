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
        players[socket.id] = { position: { x: 0, y: 0, z: 0 }, name: name };
        socket.emit('init', { id: socket.id, position: players[socket.id].position, name: name });
        socket.broadcast.emit('newPlayer', { id: socket.id, position: players[socket.id].position, name: name });
        socket.emit('allPlayers', players);
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

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('user disconnected');
        delete players[socket.id];
        io.emit('removeCube', socket.id);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
