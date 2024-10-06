const express = require('express') // Importing the Express library
const http = require('http') // Importing the HTTP module to create a server
const socketio = require('socket.io') // Importing the Socket.io library for real-time communication
const cors = require('cors') // Importing the CORS library to handle cross-origin requests
const router = require('./router')// Importing the router file (assumed to handle API routes)
const ORIGIN = 'http://localhost:3000' // URL of the frontend
const PORT = process.env.PORT || 5000; // Setting the server port, with a fallback to 5000
const {addUser,removeUser,getUser,getUserInRoom} = require('./users') // User managment utility

const app = express(); // Creating an Express application
const server = http.createServer(app)// Initialize HTTP server with the Express app

// Configure CORS options for the Express app
const corsOptions = {
    origin: ORIGIN, // Allow requests only from the specified origin (frontend)
    methods: ['GET','POST'], // Allow only GET and POST methods
    allowedHeaders:['Content-Type'], // Allow only the Content-Type header
    Credential:true, // Allow credentials to be included in requests
}

app.use(cors(corsOptions))// Apply the CORS options to the Express app
app.use(router)// Use the router for handling API routes

// Initialize Socket.io server with the CORS settings
const io = socketio(server,{cors:{corsOptions}})
// Listen for new connections on the Socket.io server
io.on('connection',(socket) =>{
    console.log('New client connected:')

    //Listen for joingn a room
    socket.on('join',({name,room}, callback) =>{
        const {error,user} = addUser({id:socket.id,name,room})
        
    })
    // Handle client disconnection
    socket.on('disconnect',()=>{
        console.log('Client disconnected:');
    })
})

// Start the server and listen on the specified port
server.listen(PORT,()=> console.log(`http://localhost:${PORT}/`))
