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
// Generate route
app.post('/api/generate', async (req, res) => {
    // 1. Determine which key to use
    // Priority: GEMINI_API_KEY -> OPENROUTER_API_KEY
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error('❌ No API Key found in environment variables');
        return res.status(500).json({ error: 'Server missing API Key' });
    }

    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    // 2. Check Key Type
    const isGoogleKey = apiKey.startsWith('AIza');

    console.log(`[Server] Using Key Type: ${isGoogleKey ? 'Google Official (AIza...)' : 'OpenRouter (sk-or...)'}`);

    try {
        if (isGoogleKey) {
            // --- GOOGLE DIRECT ---
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log(`[Gemini Direct] Success! ${text.length} chars.`);
            return res.json({ text });

        } else {
            // --- OPENROUTER FALLBACK ---
            // If they have an OR key, we must use the OR endpoint
            const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

            console.log(`[OpenRouter] Requesting model: ${modelName}`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.OPENROUTER_SITE || 'http://localhost:3000',
                    'X-Title': 'Gemi Movie Den'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || `OpenRouter ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            console.log(`[OpenRouter] Success! ${text?.length} chars.`);
            return res.json({ text });
        }
    } catch (error) {
        console.error('[Generate Error]', error.message);
        res.status(500).json({
            error: isGoogleKey
                ? `Google API Error: ${error.message}`
                : `OpenRouter Error: ${error.message}`
        });
    }
});

app.listen(PORT, () => {
    console.log(`🎬 Gemi's Movie Den running at http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) console.warn('⚠️  GEMINI_API_KEY is missing in .env');
    else console.log(`✅ Connected to Google Gemini (${MODEL_NAME})`);
});
