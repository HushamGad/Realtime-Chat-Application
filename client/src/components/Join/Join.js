import React, { useState } from 'react' // Importing React and the useState hook for managing state
import { Link } from 'react-router-dom' // Importing Link from react-router-dom to handle navigation
import './Join.css' // Importing CSS file for styling

const Join = () => {
  // Defining state variables to store the name and room inputs
  const [name, setName] = useState('') // 'name' state will store the user's name
  const [room, setRoom] = useState('') // 'room' state will store the room name
  return (
    <div className='joinOuterContainer'>
      <div className='joinInnerContainer'>
        <h1 className='heading'>Join Chat</h1>
        <div>
          <input
            className='joinInput'
            placeholder='Name'
            type='text'
            onChange={event => setName(event.target.value)}// Update 'name' state when the input changes
            required
          />
        </div>
        <div>
          <input
            className='joinInput mt-20'
            placeholder='Room' type='text'
            onChange={event => setRoom(event.target.value)} // Update 'room' state when the input changes
            required
          />
        </div>
        {/* Link to navigate to the chat page, only if both 'name' and 'room' are provided */}
        <Link onClick={event => (!name || !room) ? event.preventDefault() : null}// Prevents navigation if name or room is empty
          to={`/chat?name=${name}&room=${room}`} // Navigates to the chat page, passing name and room as query parameters
        >
          <button className='button mt-20' type='submit'>Sign In</button>
        </Link>
      </div>
    </div>
  )
}
// Exporting the Join component for use in other parts of the application
export default Join
