const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY; // Fallback to OR key if user hasn't changed variable name yet
const MODEL_NAME = 'gemini-2.0-flash-exp';

// Middlewares
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/config', (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({
            error: 'API key not configured',
            message: 'Please set GEMINI_API_KEY in .env'
        });
    }
    res.json({ ok: true, model: MODEL_NAME });
});

// Generate route
app.post('/api/generate', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY missing on server' });
    }

    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log(`[Gemini] Success! Generated ${text.length} chars.`);
        res.json({ text });
    } catch (error) {
        console.error('[Gemini] Generation failed:', error);
        res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
});

app.listen(PORT, () => {
    console.log(`🎬 Gemi's Movie Den running at http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) console.warn('⚠️  GEMINI_API_KEY is missing in .env');
    else console.log(`✅ Connected to Google Gemini (${MODEL_NAME})`);
});
