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
    try {
        // 1. Determine Key
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error('❌ [Server] ERROR: No API Key found in .env (GEMINI_API_KEY or OPENROUTER_API_KEY)');
            return res.status(500).json({ error: 'Server missing API Key configuration' });
        }

        // 2. Debug Log (Masked)
        const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
        console.log(`[Server] Request received. Key detected: ${maskedKey}`);

        // 3. Determine Provider
        const isGoogleKey = apiKey.startsWith('AIza');
        const provider = isGoogleKey ? 'GOOGLE_DIRECT' : 'OPENROUTER_PROXY';
        console.log(`[Server] Provider Mode: ${provider}`);

        const { prompt } = req.body || {};
        if (!prompt) return res.status(400).json({ error: 'Prompt is missing' });

        let textResponse = '';

        if (isGoogleKey) {
            // --- GOOGLE DIRECT ---
            console.log('[Server] Initializing GoogleGenerativeAI...');
            const genAI = new GoogleGenerativeAI(apiKey);
            // Use 1.5 Flash for stability
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            console.log('[Server] Sending prompt to Google...');
            const result = await model.generateContent(prompt);
            const response = await result.response;
            textResponse = response.text();

        } else {
            // --- OPENROUTER ---
            const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
            console.log(`[Server] Fetching from OpenRouter (${modelName})...`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Gemi Movie Den'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
            }

            const data = await response.json();
            textResponse = data.choices?.[0]?.message?.content;
        }

        if (!textResponse) throw new Error('Empty response from AI provider');

        console.log(`[Server] Success! Generated ${textResponse.length} chars.`);
        res.json({ text: textResponse });

    } catch (error) {
        console.error('❌ [Server] GENERATION FAILED:');
        console.error(error);
        res.status(500).json({
            error: error.message || 'Unknown server error',
            details: error.toString()
        });
    }
});

app.listen(PORT, () => {
    console.log(`🎬 Gemi's Movie Den running at http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) console.warn('⚠️  GEMINI_API_KEY is missing in .env');
    else console.log(`✅ Connected to Google Gemini (${MODEL_NAME})`);
});
