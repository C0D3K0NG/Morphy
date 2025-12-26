# 🎬Morphy Movie Den

A premium, AI-powered movie recommendation engine that finds the perfect film for your mood.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- **Mood-Based Recommendations**: Tell the AI exactly what you feel (e.g., "A cyber-noir with a sad ending") and get a tailored pick.
- **Genre Quick-Picks**: Browse curated collections for Action, Comedy, Horror, Sci-Fi, and Drama.
- **Rich Movie Data**:
  - 🎥 Director & Cast
  - ⏱️ Runtime
  - 📺 Streaming Availability (AI Estimated)
  - 💰 Box Office Performance
- **Power User Tools**:
  - ⚡ **Keyboard Shortcuts** for fast navigation.
  - 🎲 **Mood Randomizer** ("Surprise Me") for when you're indecisive.
  - 📋 **Export Favorites** to JSON.
  - 🔍 **"More Like This"** discovery engine.
  - 🍿 **Trailer Search** integration.
- **Premium UI**:
  - Glassmorphism design.
  - Smooth, staggered animations.
  - Responsive, dense grid layout.

## 🚀 Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/gemi-movie-den.git
    cd gemi-movie-den
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up Environment**:
    Create a `.env` file in the root directory and add your OpenRouter/Gemini API key:
    ```env
    OPENROUTER_API_KEY=your_api_key_here
    ```

4.  **Run the App**:
    ```bash
    npm start
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **`/`** | Focus the "Mood" input field |
| **`Esc`** | Go Back / Reset to Home |
| **`F`** | Toggle "Favorite" for current movie |
| **`R`** | Randomize Mood (on Home screen) |
| **`Shift + ?`** | Show Shortcuts Help |

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS (Glassmorphism), Vanilla JS.
- **Backend**: Node.js, Express (Proxy for API).
- **AI**: Gemini via OpenRouter.
- **Icons**: Lucide Icons.

---

