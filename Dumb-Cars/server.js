import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Servir archivos estáticos desde el directorio 'public'
app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.get("/", (req, res) => {
    res.render("index");
});

let players = {}; // Almacena la información de los jugadores

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Crear un nuevo jugador
  players[socket.id] = { x: 0, y: 0, z: 0 }; // Posición inicial

  // Informar a todos los clientes de la nueva conexión
  io.emit('playerData', players);

  // Actualizar la posición del coche del jugador
  socket.on('updateCar', (data) => {
    players[socket.id] = data;
    io.emit('playerData', players); // Enviar datos actualizados a todos los clientes
  });

  // Manejar desconexión de un jugador
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id]; // Eliminar al jugador desconectado
    io.emit('playerData', players); // Informar a todos los clientes de la desconexión
  });
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
