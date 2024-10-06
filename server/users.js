const { error } = require("console")

// users.js
const users = []

//Add User
const addUser = ({id,name,room}) =>{
    //Clean the data
    name = name.trim().toLowerCase()
    name = room.trim().toLowerCase()

    // Validate the data
    if(!name || !room){
        return {error: 'Name and room are required.'}
    }

    // check for existing user 
    const existingUser = users.find(user => user.room === room && user.name === name)

    if(existingUser){
        return {error: 'Username is already taken in this room'}
    }

    //Store user
    const user = {id,name,room}
    users.push(user)
    return {user}
}

// Remove User
const removeUser = id => {
const index = users.findIndex(user => user.id === id)

if(index !== -1){
    return users.splice(index,1)[0]
}
}

// Get User
const getUser = id => users.find(user => user.id === id)

// Get Users in Room
const getUserInRoom = room => users.filter(user => user.room === room)

module.exports = {addUser,removeUser,getUser,getUserInRoom}