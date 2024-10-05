import React, { useEffect, useRef, useState } from 'react' // Importing React, useEffect, useRef, and useState hooks
import { useLocation } from 'react-router' // Importing useLocation hook to access query parameters from the URL
import queryString from 'query-string' // Importing queryString to parse query parameters from the URL
import io from 'socket.io-client' // Importing socket.io-client to establish a WebSocket connection
import './Chat.css' // Importing the CSS file for styling

const ORIGIN = 'http://localhost:5000' // URL of the backend (Socket.io server)



const Chat = () => {
  const location = useLocation() // useLocation hook to access the current URL (including query parameters)
  const [name,setName] = useState('') // 'name' state will store the user's name from the query parameters
  const [room,setRoom] = useState('') // 'room' state will store the room name from the query parameters
  const socketRef = useRef() // useRef hook to create a persistent socket reference across re-renders

  useEffect(() =>{
    // Extract 'name' and 'room' from the URL query string using queryString.parse
    const {name,room} = queryString.parse(location.search)
      // Set the name and room in the component's state
      setName(name)
      setRoom(room)
    // Initialize the socket connection to the backend server with WebSocket transport
    socketRef.current = io(ORIGIN,{transports:['websocket']})

    //Emit 'join' event to the server with name and room
    socketRef.current.emit('join',{name,room},(error) =>{
      if(error){
        alert(error)
      }
    })
    console.log(socketRef.current)
  },[location.search])
  return (
    <div>
      <h1>Chat</h1>
    </div>
  )
}

export default Chat
