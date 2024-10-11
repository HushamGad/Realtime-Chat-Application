// server/router.js

const express = require('express');
const router = express.Router();

// Simple route to check server status
router.get('/', (req, res) => {
    res.send('Server is up and running!');
});

module.exports = router;
