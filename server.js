const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config();

// Check Node.js version for fetch support
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 18 && typeof fetch === 'undefined') {
    console.error('⚠️  Node.js 18+ required for fetch API. Current version:', nodeVersion);
    console.error('⚠️  Please upgrade Node.js or install node-fetch package.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';

// Middlewares
app.use(express.json({ limit: '1mb' }));

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(path.join(__dirname)));

// Health check for API key presence
app.get('/api/config', (req, res) => {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({
            error: 'API key not configured',
            message: 'Please set OPENROUTER_API_KEY in .env'
        });
    }
    res.json({ ok: true, model: OPENROUTER_MODEL });
});

// Proxy route to call OpenRouter safely from the server
app.post('/api/generate', async (req, res) => {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OPENROUTER_API_KEY missing on server' });
    }

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Valid prompt string is required' });
    }

    try {
        console.log(`[OpenRouter] Calling model: ${OPENROUTER_MODEL}`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.OPENROUTER_SITE || 'http://localhost:3000',
                'X-Title': 'Gemi Movie Den'
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 512,
                temperature: 0.7
            })
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('[OpenRouter] Failed to parse response:', responseText);
            return res.status(500).json({ error: 'Invalid JSON response from OpenRouter' });
        }

        if (!response.ok) {
            const errorMsg = data.error?.message || data.error || `OpenRouter returned ${response.status}`;
            console.error(`[OpenRouter] Error (${response.status}):`, errorMsg);
            return res.status(response.status).json({ error: errorMsg });
        }

        const text = data.choices?.[0]?.message?.content;
        if (!text) {
            console.error('[OpenRouter] Invalid response structure:', JSON.stringify(data, null, 2));
            return res.status(500).json({ error: 'Invalid response format from OpenRouter' });
        }

        console.log(`[OpenRouter] Success! Response length: ${text.length} chars`);
        res.json({ text });
    } catch (error) {
        console.error('[OpenRouter] Network error:', error.message);
        res.status(500).json({ error: `Failed to reach OpenRouter API: ${error.message}` });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🎬 Gemi's Movie Den is running at http://localhost:${PORT}`);
    if (!OPENROUTER_API_KEY) {
        console.warn('⚠️  WARNING: OPENROUTER_API_KEY is not set!');
        console.warn('⚠️  Please create a .env file with: OPENROUTER_API_KEY=your_key_here');
    } else {
        console.log(`✅ OpenRouter configured with model: ${OPENROUTER_MODEL}`);
    }
});
