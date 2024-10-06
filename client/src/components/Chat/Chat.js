import React, { useEffect, useRef, useState } from 'react' // Importing React, useEffect, useRef, and useState hooks
import { useLocation, useNavigate } from 'react-router-dom' // Importing useLocation hook to access query parameters from the URL
import queryString from 'query-string' // Importing queryString to parse query parameters from the URL
import io from 'socket.io-client' // Importing socket.io-client to establish a WebSocket connection
import './Chat.css' // Importing the CSS file for styling

const ENDPOINT = 'http://localhost:5000' // URL of the backend (Socket.io server)

let socket

const Chat = () => {
  const location = useLocation() // useLocation hook to access the current URL (including query parameters)
  const navigate = useNavigate()
  const [name,setName] = useState('') // 'name' state will store the user's name from the query parameters
  const [room,setRoom] = useState('') // 'room' state will store the room name from the query parameters
  const [messages,setMessages] = useState([])
  const [message,setMessage] = useState('')
  const socketRef = useRef() // useRef hook to create a persistent socket reference across re-renders

  useEffect(() =>{
    // Extract 'name' and 'room' from the URL query string using queryString.parse
    const {name,room} = queryString.parse(location.search)

      if(!name || !room){
        navigate('/') // Redirect to join if name or room is missing
        return
      }
      // Set the name and room in the component's state
      setName(name)
      setRoom(room)
    // Initialize the socket connection to the backend server with WebSocket transport
    socket = io(ENDPOINT,{transports:['websocket']})
    socketRef.current = socket
    //Emit 'join' event to the server with name and room
    socket.emit('join',{name,room},(error) =>{
      if(error){
        alert(error)
        navigate('/')
      }
    })
    console.log(socket)
    // Cleanup on component unmount
    // return () =>{
    //   socket.emit('disconnect')
    //   socket.off()
    // }
    
  },[ENDPOINT,location.search,navigate])
  return (
    <div>
      <h1>Chat</h1>
    </div>
  )
}

export default Chat
