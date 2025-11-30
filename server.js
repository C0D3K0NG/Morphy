const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config();

const app = express();
const PORT = 3000;

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(path.join(__dirname)));

// API endpoint to get the Gemini API key
app.get('/api/config', (req, res) => {
    res.json({ apiKey: process.env.GEMINI_API_KEY });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎬 Gemi's Movie Den is running at http://localhost:${PORT}`);
});
