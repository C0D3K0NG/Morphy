// --- CONFIGURATION ---
// API Key is fetched from server (loaded from .env file)
let API_KEY = null;

// Fetch API key from server on page load
async function initializeAPIKey() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        API_KEY = config.apiKey;
        console.log('✅ API Key loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load API key:', error);
        alert('Could not load API key. Make sure the server is running!');
    }
} 

// --- STATE MANAGEMENT ---
const state = {
    step: 'genre', // 'genre', 'ai-input', 'result'
    selectedGenre: null,
    movie: null,
    customMood: '',
    isLoading: false,
    aiHype: null,
    isHypeLoading: false
};

// --- DATABASE ---
// Note: 'iconFile' matches the PNG filename in your assets folder
const movieDatabase = {
    Action: {
        list: [
            { title: "Mad Max: Fury Road", year: "2015", desc: "Pure adrenaline.", rating: "8.1" },
            { title: "John Wick", year: "2014", desc: "Never mess with a man's dog.", rating: "7.4" }
        ],
        iconFile: "action.png",
        sub: "Dishoom Dishoom"
    },
    Comedy: {
        list: [
            { title: "Superbad", year: "2007", desc: "High school cringe.", rating: "7.6" },
            { title: "The Grand Budapest Hotel", year: "2014", desc: "Quirky magic.", rating: "8.1" }
        ],
        iconFile: "comedy.png",
        sub: "Haste Haste Pagol"
    },
    Horror: {
        list: [
            { title: "Hereditary", year: "2018", desc: "Disturbing drama.", rating: "7.3" },
            { title: "The Shining", year: "1980", desc: "Here's Johnny!", rating: "8.4" }
        ],
        iconFile: "horror.png",
        sub: "Bhoy Pabi Na Toh?"
    },
    SciFi: {
        list: [
            { title: "Interstellar", year: "2014", desc: "Space travel.", rating: "8.6" },
            { title: "Inception", year: "2010", desc: "Dream within a dream.", rating: "8.8" }
        ],
        iconFile: "scifi.png",
        sub: "Matha Nosto"
    },
    Drama: {
        list: [
            { title: "Parasite", year: "2019", desc: "Class war masterpiece.", rating: "8.5" },
            { title: "Whiplash", year: "2014", desc: "Intense drumming.", rating: "8.5" }
        ],
        iconFile: "drama.png",
        sub: "Emotional Atyachar"
    }
};

// --- GEMINI API HELPER ---
async function callGemini(prompt) {
    if (!API_KEY) {
        alert("Bhai API Key ta script.js e bosha age!");
        return null;
    }
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            }
        );
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        alert("Gemini ektu busy ache re bhai, pore try kor!");
        return null;
    }
}

// --- RENDER FUNCTIONS ---
const container = document.getElementById('app-container');

function render() {
    container.innerHTML = ''; // Clear current content
    
    if (state.step === 'genre') renderGenreView();
    else if (state.step === 'ai-input') renderAiInputView();
    else if (state.step === 'result') renderResultView();
    
    // Initialize standard UI icons (back arrows etc) from Lucide
    if(window.lucide) lucide.createIcons();
}

function renderGenreView() {
    // Generate genre cards dynamically
    const genreCardsHTML = Object.keys(movieDatabase).map(key => {
        const data = movieDatabase[key];
        return createGenreCard(key, data.iconFile, data.sub);
    }).join('');

    const html = `
        <div class="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <!-- Magic Mood Button -->
            <button onclick="setStep('ai-input')" class="md:col-span-2 group relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 hover:border-orange-500/50 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)]">
                <div class="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <i data-lucide="sparkles" class="text-orange-500 w-[100px] h-[100px] rotate-12"></i>
                </div>
                <div class="relative z-10">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-4 shadow-lg shadow-orange-900/20">
                        <i data-lucide="message-circle" class="text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">Mood Ta Bol Dekhi?</h3>
                    <p class="text-gray-400 text-sm max-w-md">
                        Don't know the genre? Just tell me how you feel.
                    </p>
                </div>
            </button>

            <!-- Genre Buttons (Now using PNGs from assets) -->
            ${genreCardsHTML}
        </div>
    `;
    container.innerHTML = html;
}

function createGenreCard(genre, iconFile, sub) {
    return `
    <button onclick="pickGenre('${genre}')" class="group flex items-center justify-between p-5 bg-[#121212] border border-white/5 rounded-xl hover:bg-[#1a1a1a] hover:border-white/10 transition-all duration-200 w-full">
        <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-white/5 text-gray-400 group-hover:bg-orange-500/10 transition-colors">
                <!-- USING PNG FROM ASSETS FOLDER -->
                <img src="assets/${iconFile}" alt="${genre}" class="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity">
            </div>
            <div class="text-left">
                <div class="font-bold text-gray-200 group-hover:text-white transition-colors">${genre}</div>
                <div class="text-xs text-gray-500 font-mono group-hover:text-orange-400/80">${sub}</div>
            </div>
        </div>
        <div class="text-gray-600 group-hover:text-orange-500 transition-transform group-hover:translate-x-1">→</div>
    </button>`;
}

function renderAiInputView() {
    const html = `
        <div class="animate-fade-in bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 relative overflow-hidden">
            <button onclick="reset()" class="text-gray-500 hover:text-white flex items-center gap-2 text-sm mb-6 transition-colors">
                <i data-lucide="arrow-left" width="16"></i> Back
            </button>
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-white mb-2">Ki icche korche?</h2>
                <p class="text-gray-400 text-sm">Mon khule bol. Ami judge korbo na.</p>
            </div>
            <textarea id="moodInput" 
                class="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-5 text-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all resize-none mb-6"
                placeholder="Ex: 'Space e robbery hobe emon kichu'..."
            >${state.customMood}</textarea>
            <button onclick="handleAIMoodSubmit()" id="aiSubmitBtn"
                class="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-lg tracking-wide hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                ${state.isLoading ? '<i data-lucide="loader-2" class="animate-spin"></i> Wait kor, khujchi...' : 'Khuje De! (Find It)'}
            </button>
        </div>
    `;
    container.innerHTML = html;
    
    // Re-attach input listener
    document.getElementById('moodInput').addEventListener('input', (e) => {
        state.customMood = e.target.value;
    });
}

function renderResultView() {
    if (!state.movie) return;
    
    const html = `
        <div class="animate-fade-in bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden relative group hover:border-white/20 transition-all">
            <div class="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span class="text-sm font-mono text-gray-400 uppercase tracking-widest">
                        ${state.selectedGenre === 'AI Choice' ? 'GEMI_FOUND_IT!' : `VIBE: ${state.selectedGenre.toUpperCase()}`}
                    </span>
                </div>
                <div class="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 text-xs font-bold">
                    IMDb ${state.movie.rating}
                </div>
            </div>

            <div class="p-8 md:p-10 text-center relative z-10">
                <h2 class="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-4 tracking-tight">
                    ${state.movie.title}
                </h2>
                <div class="inline-block px-4 py-1 rounded-full bg-white/10 text-gray-300 text-sm font-medium mb-6">
                    ${state.movie.year}
                </div>
                <p class="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto italic border-l-2 border-orange-500/50 pl-4 md:pl-0 md:border-l-0">
                    "${state.movie.desc}"
                </p>

                ${state.aiHype ? `
                <div class="mt-8 p-6 bg-orange-500/5 border border-orange-500/20 rounded-xl text-left animate-fade-in">
                    <div class="flex items-center gap-2 text-orange-400 text-sm font-bold mb-2 uppercase tracking-wide">
                        <i data-lucide="sparkles" width="14"></i> Gemi Says:
                    </div>
                    <p class="text-gray-300 leading-relaxed">"${state.aiHype}"</p>
                </div>` : ''}
            </div>

            <div class="p-6 bg-black/20 border-t border-white/5 flex flex-col md:flex-row gap-4">
                ${!state.aiHype ? `
                <button onclick="generateHype()" id="hypeBtn" class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                    ${state.isHypeLoading ? '<i data-lucide="loader-2" class="animate-spin" width="16"></i>' : '<i data-lucide="sparkles" class="text-orange-500" width="16"></i>'}
                    Keno Dekhbo? (Hype Me)
                </button>` : ''}
                
                <button onclick="reset()" class="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] text-white rounded-xl font-bold transition-all">
                    Mood Swing?
                </button>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

// --- CONTROLLER FUNCTIONS ---
function setStep(newStep) {
    state.step = newStep;
    render();
}

function pickGenre(genre) {
    if (genre === 'AI Choice') {
        setStep('ai-input');
        return;
    }
    state.selectedGenre = genre;
    const list = movieDatabase[genre].list;
    state.movie = list[Math.floor(Math.random() * list.length)];
    state.aiHype = null;
    state.step = 'result';
    render();
}

async function handleAIMoodSubmit() {
    if (!state.customMood.trim()) return;
    state.isLoading = true;
    render();
    const prompt = `Recommend ONE movie based on: "${state.customMood}". Return JSON {title, year, rating, desc}. No markdown.`;

    try {
        const resultText = await callGemini(prompt);
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        state.movie = JSON.parse(cleanJson);
        state.selectedGenre = 'AI Choice';
        state.aiHype = null;
        state.step = 'result';
    } catch (e) {
        alert("Oops! Try again.");
    } finally {
        state.isLoading = false;
        render();
    }
}

async function generateHype() {
    if (!state.movie) return;
    state.isHypeLoading = true;
    render();
    const prompt = `Give me a short hype pitch for "${state.movie.title}".`;
    const hype = await callGemini(prompt);
    state.aiHype = hype;
    state.isHypeLoading = false;
    render();
}

function reset() {
    state.step = 'genre';
    state.selectedGenre = null;
    state.movie = null;
    state.customMood = '';
    state.aiHype = null;
    render();
}

// Start app - Initialize API key first
initializeAPIKey().then(() => {
    render();
});