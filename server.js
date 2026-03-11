const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    if (waitingPlayer) {
        // Match found
        const room = `room-${waitingPlayer.id}-${socket.id}`;
        const opponent = waitingPlayer;
        
        waitingPlayer = null;

        socket.join(room);
        opponent.join(room);

        // Assign roles
        io.to(opponent.id).emit('init', { role: 'X', room });
        io.to(socket.id).emit('init', { role: 'O', room });

        console.log(`Game started in ${room}`);
    } else {
        // Wait for opponent
        waitingPlayer = socket;
        socket.emit('waiting', { message: 'Waiting for an opponent...' });
    }

    socket.on('throw', (data) => {
        // Relay throw data (velocity, etc.) to the other player in the room
        socket.to(data.room).emit('opponent-throw', data);
    });

    socket.on('settled', (data) => {
        // Relay final position/grid data
        socket.to(data.room).emit('opponent-settled', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        } else {
            // Notify opponent if they were in a game (simplified)
            // In a real app, we'd track which room the socket was in
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
