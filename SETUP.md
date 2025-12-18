# Setup Instructions

## API Configuration (OpenRouter)

The app now uses OpenRouter to proxy AI requests. Your key stays on the server (not in the browser).

1. **Get an OpenRouter API Key:**
   - Sign up at https://openrouter.ai
   - Create a new API key

2. **Create a `.env` file** in the project root directory:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   # Optional overrides:
   # OPENROUTER_MODEL=google/gemini-flash-1.5
   # PORT=3000
   # OPENROUTER_SITE=http://localhost:3000
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Navigate to: http://localhost:3000

## Troubleshooting

- **"API Key not configured" error:**
  - Make sure you created a `.env` file in the root directory
  - Check that the file contains: `OPENROUTER_API_KEY=your_key_here`
  - Restart the server after creating/editing the `.env` file

- **"Could not connect to server" error:**
  - Make sure the server is running (`npm start`)
  - Check that you're accessing http://localhost:3000
  - Verify the port isn't already in use

- **"Model is not running" or API errors:**
  - The server proxies via OpenRouter; check the server console for errors
  - Verify your OpenRouter key is valid and active
  - Ensure you have internet connectivity
  - Confirm the model is available (default: google/gemini-flash-1.5)
  - Restart the server after changing the .env file

- **Model-specific errors:**
  - If you see "model not found" errors, set `OPENROUTER_MODEL` in `.env` to a known-available model (e.g., `google/gemini-flash-1.5`)
  - Check server logs for detailed messages

