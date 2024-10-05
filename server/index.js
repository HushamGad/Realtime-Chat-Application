const express = require('express') // Importing the Express library
const http = require('http') // Importing the HTTP module to create a server
const socketio = require('socket.io') // Importing the Socket.io library for real-time communication
const cors = require('cors') // Importing the CORS library to handle cross-origin requests
const router = require('./router')// Importing the router file (assumed to handle API routes)
const ORIGIN = 'http://localhost:3000' // URL of the frontend
const PORT = process.env.PORT || 5000; // Setting the server port, with a fallback to 5000

const app = express(); // Creating an Express application

// Configure CORS options for the Express app
const corsOptions = {
    origin: ORIGIN, // Allow requests only from the specified origin (frontend)
    methods: ['GET','POST'], // Allow only GET and POST methods
    allowedHeaders:['Content-Type'], // Allow only the Content-Type header
    Credential:true, // Allow credentials to be included in requests
}

app.use(cors(corsOptions))// Apply the CORS options to the Express app
app.use(router)// Use the router for handling API routes

const server = http.createServer(app)// Initialize HTTP server with the Express app

// Initialize Socket.io server with the CORS settings
const io = socketio(server,{
    cors:{
        origin: ORIGIN,
        methods: ['GET','POST'],
        allowedHeaders:['Content-Type'],
        Credential:true,
    }
})
// Listen for new connections on the Socket.io server
io.on('connection',(socket) =>{
    console.log('New client connected!!!')

    //Listen for joingn a room
    socket.on('join',({name,room}) =>{
        console.log(name,room);
    })
    // Handle client disconnection
    socket.on('disconnect',()=>{
        console.log('User had left!!!');
    })
})

// Start the server and listen on the specified port
server.listen(PORT,()=> console.log(`http://localhost:${PORT}/`))
