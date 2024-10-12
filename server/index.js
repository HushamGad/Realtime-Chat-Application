// server.js

require('dotenv').config(); // Load environment variables

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const router = require('./router');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const PORT = process.env.PORT || 5000;
const ORIGIN = 'https://my-react-chat-app-123.netlify.app';
const MONGO_URI = process.env.MONGO_URI;

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware Configuration
app.use(helmet()); // Secure HTTP headers
app.use(express.json()); // Parse JSON bodies

// CORS Configuration
const corsOptions = {
    origin: ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
};
app.use(cors(corsOptions));

// Rate Limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after a minute.',
});
app.use(limiter);

// Routes
app.use(router);

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
});

// Define Message Schema and Model
const messageSchema = new mongoose.Schema({
    room: { type: String, required: true, index: true },
    user: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
    time: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Initialize Socket.io
const io = socketio(server, {
    cors: {
        origin: ORIGIN,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});

// Helper Function: Fetch Chat History with Pagination
const fetchChatHistory = async (room, limit = 100) => {
    try {
        const messages = await Message.find({ room })
            .sort({ time: 1 }) // Oldest first
            .limit(limit)
            .lean()
            .exec();
        return messages;
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return [];
    }
};

// Socket.io Connection Handler
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Handle User Joining a Room
    socket.on('join', async ({ name, room }, callback) => {
        console.log(`Socket ${socket.id} attempting to join room: ${room} as ${name}`);

        // Input Validation and Sanitization
        if (
            typeof name !== 'string' || 
            typeof room !== 'string' ||
            !validator.isLength(name, { min: 1, max: 50 }) ||
            !validator.isLength(room, { min: 1, max: 50 })
        ) {
            const error = 'Invalid name or room.';
            console.error(`Join Error for socket ${socket.id}:`, error);
            return callback(error);
        }

        const sanitizedName = validator.escape(name.trim());
        const sanitizedRoom = validator.escape(room.trim());

        const { error, user } = addUser({ id: socket.id, name: sanitizedName, room: sanitizedRoom });

        if (error) {
            console.error(`Join Error for socket ${socket.id}:`, error);
            return callback(error);
        }

        socket.join(user.room);
        console.log(`Socket ${socket.id} joined room: ${user.room}`);

        // Fetch and send existing chat history
        const chatHistory = await fetchChatHistory(user.room);
        socket.emit('chatHistory', chatHistory);
        console.log(`Sent chat history to ${user.name} in room ${user.room}`);

        // Welcome current user
        const welcomeMsg = { 
            user: 'admin', 
            text: `Welcome to the room, ${user.name}!`, 
            time: Date.now(),
        };
        socket.emit('message', welcomeMsg);
        console.log(`Sent welcome message to ${user.name}`);

        // Broadcast when a user connects
        const joinMsg = { 
            user: 'admin', 
            text: `${user.name} has joined!`, 
            time: Date.now(),
        };
        socket.broadcast.to(user.room).emit('message', joinMsg);
        console.log(`Broadcasted join message for ${user.name} to room ${user.room}`);

        // Send users and room info
        io.to(user.room).emit('roomData', { 
            room: user.room, 
            users: getUsersInRoom(user.room),
        });
        console.log(`Sent room data for room ${user.room}`);

        callback();
    });

    // Handle Sending Messages
    socket.on('sendMessage', async (message, callback) => {
        const user = getUser(socket.id);

        if (!user) {
            const error = 'User not found.';
            console.error(`SendMessage Error for socket ${socket.id}:`, error);
            return callback(error);
        }

        // Input Validation and Sanitization
        if (
            typeof message !== 'string' ||
            !validator.isLength(message.trim(), { min: 1, max: 500 })
        ) {
            const error = 'Message must be between 1 and 500 characters.';
            console.error(`Invalid message from socket ${socket.id}: "${message}"`);
            return callback(error);
        }

        const sanitizedMessage = validator.escape(message.trim());

        const msg = { 
            room: user.room,
            user: user.name, 
            text: sanitizedMessage, 
            time: Date.now(),
        };

        try {
            // Store the message in MongoDB
            const messageDoc = new Message(msg);
            await messageDoc.save();

            // Emit the message to the room
            io.to(user.room).emit('message', msg);
            console.log(`Stored and emitted message for room ${user.room}:`, msg);

            callback();
        } catch (error) {
            console.error('Error sending message:', error);
            callback('Failed to send message.');
        }
    });

    // Handle Typing Indicator with Debouncing
    let typingTimeout;
    socket.on('typing', () => {
        const user = getUser(socket.id);
        if (user) {
            console.log(`${user.name} is typing...`);
            socket.broadcast.to(user.room).emit('typing', { name: user.name });

            // Clear previous timeout
            clearTimeout(typingTimeout);

            // Set a timeout to emit 'stopTyping' after 3 seconds of inactivity
            typingTimeout = setTimeout(() => {
                socket.broadcast.to(user.room).emit('stopTyping', { name: user.name });
                console.log(`${user.name} stopped typing (debounced).`);
            }, 3000);
        }
    });

    // Handle Stop Typing
    socket.on('stopTyping', () => {
        const user = getUser(socket.id);
        if (user) {
            console.log(`${user.name} stopped typing.`);
            socket.broadcast.to(user.room).emit('stopTyping', { name: user.name });
        }
    });

    // Handle User Disconnect
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            console.log(`Socket ${socket.id} (${user.name}) has disconnected from room ${user.room}`);

            const leaveMsg = { 
                user: 'admin', 
                text: `${user.name} has left.`, 
                time: Date.now(),
            };
            io.to(user.room).emit('message', leaveMsg);
            console.log(`Broadcasted leave message for ${user.name} to room ${user.room}`);

            io.to(user.room).emit('roomData', { 
                room: user.room, 
                users: getUsersInRoom(user.room),
            });
            console.log(`Sent updated room data for room ${user.room}`);
        }
    });
});

// Start the Server
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}/`);
});
