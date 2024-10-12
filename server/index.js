// server.js
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const router = require('./router');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');
const dayjs = require('dayjs');
require('dotenv').config(); // Load environment variables

// Load environment variables
const ORIGIN = process.env.ORIGIN || 'https://my-react-chat-app-123.netlify.app';
const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);

// CORS configuration options
const corsOptions = {
    origin: ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true, // Allow credentials such as cookies
};

// Apply CORS middleware to Express
app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON bodies
app.use(router); // Use your router for API endpoints

// Initialize Socket.io with CORS settings
const io = socketio(server, {
    cors: {
        origin: ORIGIN,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    }
});

// In-memory message store
const messages = {}; // Structure: { roomName: [message1, message2, ...] }

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('join', ({ name, room }, callback) => {
        console.log(`Socket ${socket.id} attempting to join room: ${room} as ${name}`);
        const { error, user } = addUser({ id: socket.id, name, room });

        if (error) {
            console.error(`Join Error for socket ${socket.id}:`, error);
            return callback(error);
        }

        socket.join(user.room);
        console.log(`Socket ${socket.id} joined room: ${user.room}`);

        // Initialize message array for the room if it doesn't exist
        if (!messages[user.room]) {
            messages[user.room] = [];
        }

        // Send existing chat history to the newly joined user
        socket.emit('chatHistory', messages[user.room]);
        console.log(`Sent chat history to ${user.name} in room ${user.room}`);

        // Welcome current user
        const welcomeMsg = { 
            user: 'admin', 
            text: `Welcome to the room, ${user.name}!`, 
            time: Date.now() // Use Unix timestamp
        };
        socket.emit('message', welcomeMsg);
        console.log(`Sent welcome message to ${user.name}`);

        // Broadcast when a user connects
        const joinMsg = { 
            user: 'admin', 
            text: `${user.name} has joined!`, 
            time: Date.now() // Use Unix timestamp
        };
        socket.broadcast.to(user.room).emit('message', joinMsg);
        console.log(`Broadcasted join message for ${user.name} to room ${user.room}`);

        // Send users and room info
        io.to(user.room).emit('roomData', { 
            room: user.room, 
            users: getUsersInRoom(user.room) 
        });
        console.log(`Sent room data for room ${user.room}`);

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        if (user && message.trim()) {
            const msg = { 
                user: user.name, 
                text: message, 
                time: Date.now() // Use Unix timestamp
            };
            console.log(`Storing message for room ${user.room}:`, msg);
            io.to(user.room).emit('message', msg);
            
            // Store the message in the server's memory
            messages[user.room].push(msg);
            
            callback();
        } else {
            console.error(`Invalid message from socket ${socket.id}: "${message}"`);
            callback('Message cannot be empty.');
        }
    });

    // Handle typing indicator
    socket.on('typing', () => {
        const user = getUser(socket.id);
        if (user) {
            console.log(`${user.name} is typing...`);
            socket.broadcast.to(user.room).emit('typing', { name: user.name });
        }
    });

    socket.on('stopTyping', () => {
        const user = getUser(socket.id);
        if (user) {
            console.log(`${user.name} stopped typing.`);
            socket.broadcast.to(user.room).emit('stopTyping', { name: user.name });
        }
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            console.log(`Socket ${socket.id} (${user.name}) has disconnected from room ${user.room}`);

            const leaveMsg = { 
                user: 'admin', 
                text: `${user.name} has left.`, 
                time: Date.now() // Use Unix timestamp
            };
            io.to(user.room).emit('message', leaveMsg);
            console.log(`Broadcasted leave message for ${user.name} to room ${user.room}`);

            io.to(user.room).emit('roomData', { 
                room: user.room, 
                users: getUsersInRoom(user.room) 
            });
            console.log(`Sent updated room data for room ${user.room}`);
        }
    });
});

// Start the server
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
