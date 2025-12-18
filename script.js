// --- CONFIGURATION ---
// API is proxied through the server; no key in the browser
let API_READY = false;

// Check server health on load
async function initializeAPIKey() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Server not ready');
        API_READY = true;
        console.log('✅ API ready');
    } catch (error) {
        console.error('❌ Failed to reach API:', error);
        alert('Could not reach the server. Make sure it is running (npm start) and that OPENROUTER_API_KEY is set in .env');
    }
} 

// --- STATE MANAGEMENT ---
const state = {
    step: 'genre', // 'genre', 'ai-input', 'result', 'mylist'
    selectedGenre: null,
    movie: null,
    customMood: '',
    isLoading: false,
    aiHype: null,
    isHypeLoading: false
};

// --- STORAGE FUNCTIONS ---
function getFavorites() {
    try {
        const stored = localStorage.getItem('gemi_favorites');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading favorites from localStorage:', e);
        return [];
    }
}

function saveFavorites(favorites) {
    try {
        localStorage.setItem('gemi_favorites', JSON.stringify(favorites));
    } catch (e) {
        console.error('Error saving favorites to localStorage:', e);
        alert('Failed to save favorites. Your browser may have storage restrictions.');
    }
}

function addToFavorites(movie) {
    const favorites = getFavorites();
    // Check if movie already exists (by title and year)
    const exists = favorites.some(fav => fav.title === movie.title && fav.year === movie.year);
    if (!exists) {
        const movieWithId = {
            ...movie,
            id: `${movie.title}_${movie.year}_${Date.now()}`,
            addedAt: new Date().toISOString(),
            genre: state.selectedGenre || 'Unknown'
        };
        favorites.push(movieWithId);
        saveFavorites(favorites);
        return true;
    }
    return false;
}

function removeFromFavorites(movieId) {
    const favorites = getFavorites();
    const filtered = favorites.filter(fav => fav.id !== movieId);
    saveFavorites(filtered);
}

function isFavorite(movie) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.title === movie.title && fav.year === movie.year);
}

function getMovieId(movie) {
    const favorites = getFavorites();
    const found = favorites.find(fav => fav.title === movie.title && fav.year === movie.year);
    return found ? found.id : null;
}

function addToWatchHistory(movie) {
    try {
        const history = getWatchHistory();
        const movieEntry = {
            ...movie,
            viewedAt: new Date().toISOString(),
            genre: state.selectedGenre || 'Unknown'
        };
        // Remove if already exists and add to front
        const filtered = history.filter(h => !(h.title === movie.title && h.year === movie.year));
        filtered.unshift(movieEntry);
        // Keep only last 50 entries
        const limited = filtered.slice(0, 50);
        localStorage.setItem('gemi_watch_history', JSON.stringify(limited));
    } catch (e) {
        console.error('Error saving watch history:', e);
        // Don't show alert for watch history - it's not critical
    }
}

function getWatchHistory() {
    try {
        const stored = localStorage.getItem('gemi_watch_history');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading watch history from localStorage:', e);
        return [];
    }
}

// --- DATABASE ---
// Using Lucide icons for genre visualization
const movieDatabase = {
    Action: {
        list: [
            { title: "Mad Max: Fury Road", year: "2015", desc: "Pure adrenaline.", rating: "8.1" },
            { title: "John Wick", year: "2014", desc: "Never mess with a man's dog.", rating: "7.4" }
        ],
        icon: "zap",
        sub: "Action Packed"
    },
    Comedy: {
        list: [
            { title: "Superbad", year: "2007", desc: "High school cringe.", rating: "7.6" },
            { title: "The Grand Budapest Hotel", year: "2014", desc: "Quirky magic.", rating: "8.1" }
        ],
        icon: "smile",
        sub: "Laugh Out Loud"
    },
    Horror: {
        list: [
            { title: "Hereditary", year: "2018", desc: "Disturbing drama.", rating: "7.3" },
            { title: "The Shining", year: "1980", desc: "Here's Johnny!", rating: "8.4" }
        ],
        icon: "skull",
        sub: "Scared Yet?"
    },
    SciFi: {
        list: [
            { title: "Interstellar", year: "2014", desc: "Space travel.", rating: "8.6" },
            { title: "Inception", year: "2010", desc: "Dream within a dream.", rating: "8.8" }
        ],
        icon: "rocket",
        sub: "Mind Blown"
    },
    Drama: {
        list: [
            { title: "Parasite", year: "2019", desc: "Class war masterpiece.", rating: "8.5" },
            { title: "Whiplash", year: "2014", desc: "Intense drumming.", rating: "8.5" }
        ],
        icon: "film",
        sub: "Emotional Rollercoaster"
    }
};

// --- GEMINI API HELPER ---
async function callGemini(prompt) {
    if (!API_READY) {
        console.error("API not ready");
        return null;
    }
    
    if (!prompt || !prompt.trim()) {
        console.error("Empty prompt provided");
        return null;
    }
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt.trim() })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `Server returned ${response.status}`;
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (!data || !data.text) {
            throw new Error('Invalid response format from server');
        }

        return data.text.trim();
    } catch (error) {
        console.error("OpenRouter API Error:", error);
        // Don't show alert here - let the calling function handle it
        return null;
    }
}

// --- RENDER FUNCTIONS ---
const container = document.getElementById('app-container');

function updateNavbarBadge() {
    try {
        const favorites = getFavorites();
        const badge = document.getElementById('favorites-badge');
        if (badge) {
            badge.textContent = favorites.length;
            badge.style.display = favorites.length > 0 ? 'flex' : 'none';
        }
    } catch (e) {
        console.error('Error updating navbar badge:', e);
    }
}

function render() {
    if (!container) {
        console.error('Container element not found!');
        return;
    }
    
    try {
        container.innerHTML = ''; // Clear current content
        
        if (state.step === 'genre') renderGenreView();
        else if (state.step === 'ai-input') renderAiInputView();
        else if (state.step === 'result') renderResultView();
        else if (state.step === 'mylist') renderMyListView();
        
        // Update navbar badge
        updateNavbarBadge();
        
        // Initialize standard UI icons (back arrows etc) from Lucide
        if (window.lucide) {
            try {
                lucide.createIcons();
            } catch (e) {
                console.warn('Error initializing Lucide icons:', e);
            }
        }
    } catch (e) {
        console.error('Error during render:', e);
        container.innerHTML = '<div class="p-8 text-center text-red-400">An error occurred. Please refresh the page.</div>';
    }
}

function renderGenreView() {
    // Generate genre cards dynamically
    const genreCardsHTML = Object.keys(movieDatabase).map(key => {
        const data = movieDatabase[key];
        return createGenreCard(key, data.icon, data.sub);
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
                    <h3 class="text-2xl font-bold text-white mb-2">What's Your Mood?</h3>
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

function createGenreCard(genre, iconName, sub) {
    return `
    <button onclick="pickGenre('${genre}')" class="group flex items-center justify-between p-5 bg-[#121212] border border-white/5 rounded-xl hover:bg-[#1a1a1a] hover:border-white/10 transition-all duration-200 w-full">
        <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-white/5 text-gray-400 group-hover:bg-orange-500/10 group-hover:text-orange-400 transition-colors">
                <!-- USING LUCIDE ICONS -->
                <i data-lucide="${iconName}" class="w-6 h-6 opacity-70 group-hover:opacity-100 transition-opacity"></i>
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
                <h2 class="text-2xl font-bold text-white mb-2">What are you in the mood for?</h2>
                <p class="text-gray-400 text-sm">Speak your mind. I won't judge.</p>
            </div>
            <textarea id="moodInput" 
                class="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-5 text-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all resize-none mb-6"
                placeholder="Ex: 'Something like a space heist'..."
            >${state.customMood}</textarea>
            <button onclick="handleAIMoodSubmit()" id="aiSubmitBtn"
                class="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-lg tracking-wide hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                ${state.isLoading ? '<i data-lucide="loader-2" class="animate-spin"></i> Searching...' : 'Find It!'}
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
    
    // Add to watch history when viewing a movie
    addToWatchHistory(state.movie);
    
    const isFav = isFavorite(state.movie);
    const favoriteBtnText = isFav ? 'Remove from Favorites' : 'Add to Favorites';
    const favoriteBtnIcon = isFav ? 'heart' : 'heart';
    const favoriteBtnClass = isFav 
        ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400' 
        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white';
    
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
                <button onclick="toggleFavorite()" class="py-3 px-4 ${favoriteBtnClass} border rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                    <i data-lucide="${favoriteBtnIcon}" width="18" class="${isFav ? 'fill-current' : ''}"></i>
                    ${isFav ? 'Liked' : 'Like'}
                </button>
                
                ${!state.aiHype ? `
                <button onclick="generateHype()" id="hypeBtn" class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                    ${state.isHypeLoading ? '<i data-lucide="loader-2" class="animate-spin" width="16"></i>' : '<i data-lucide="sparkles" class="text-orange-500" width="16"></i>'}
                    Why Watch It? (Hype Me)
                </button>` : ''}
                
                <button onclick="reset()" class="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-[0_0_20px_rgba(234,88,12,0.3)] text-white rounded-xl font-bold transition-all">
                    Change Mood?
                </button>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function renderMyListView() {
    const favorites = getFavorites();
    const history = getWatchHistory();
    
    const favoritesHTML = favorites.length > 0 
        ? favorites.map(movie => createFavoriteCard(movie)).join('')
        : '<div class="text-center py-12 text-gray-500"><i data-lucide="heart-off" class="w-16 h-16 mx-auto mb-4 opacity-50"></i><p>No favorites yet. Start liking movies!</p></div>';
    
    const historyHTML = history.length > 0
        ? history.slice(0, 10).map(movie => createHistoryCard(movie)).join('')
        : '<div class="text-center py-12 text-gray-500"><i data-lucide="clock" class="w-16 h-16 mx-auto mb-4 opacity-50"></i><p>No watch history yet.</p></div>';
    
    const html = `
        <div class="animate-fade-in">
            <button onclick="reset()" class="text-gray-500 hover:text-white flex items-center gap-2 text-sm mb-6 transition-colors">
                <i data-lucide="arrow-left" width="16"></i> Back to Home
            </button>
            
            <div class="mb-12">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h2 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <i data-lucide="heart" class="text-red-500" width="28"></i>
                            My Favorites (${favorites.length})
                        </h2>
                        <p class="text-gray-400 text-sm">Movies you've liked</p>
                    </div>
                    ${favorites.length > 0 ? `
                    <button onclick="clearAllFavorites()" class="text-red-400 hover:text-red-300 text-sm px-4 py-2 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2">
                        <i data-lucide="trash-2" width="16"></i>
                        Clear All
                    </button>
                    ` : ''}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${favoritesHTML}
                </div>
            </div>
            
            <div class="mb-8">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h2 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <i data-lucide="clock" class="text-orange-500" width="28"></i>
                            Recently Viewed
                        </h2>
                        <p class="text-gray-400 text-sm">Movies you've checked out</p>
                    </div>
                    ${history.length > 0 ? `
                    <button onclick="clearWatchHistory()" class="text-gray-400 hover:text-gray-300 text-sm px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg transition-all flex items-center gap-2">
                        <i data-lucide="trash-2" width="16"></i>
                        Clear History
                    </button>
                    ` : ''}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${historyHTML}
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function createFavoriteCard(movie) {
    const date = new Date(movie.addedAt);
    const dateStr = date.toLocaleDateString();
    const movieId = movie.id || `${movie.title}_${movie.year}`;
    
    return `
        <div class="bg-[#121212] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all group cursor-pointer" onclick="viewMovieFromFavorites('${movieId}')">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">${movie.title}</h3>
                    <div class="flex items-center gap-3 text-sm text-gray-400">
                        <span>${movie.year}</span>
                        <span>•</span>
                        <span class="text-orange-400 font-bold">IMDb ${movie.rating}</span>
                    </div>
                </div>
                <button onclick="event.stopPropagation(); removeFavorite('${movie.id}')" class="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg">
                    <i data-lucide="x" width="18"></i>
                </button>
            </div>
            <p class="text-gray-400 text-sm mb-3 italic">"${movie.desc}"</p>
            <div class="flex items-center justify-between text-xs text-gray-500">
                <span class="px-2 py-1 bg-white/5 rounded">${movie.genre}</span>
                <span>Added ${dateStr}</span>
            </div>
        </div>
    `;
}

function createHistoryCard(movie) {
    const date = new Date(movie.viewedAt);
    const dateStr = date.toLocaleDateString();
    const isFav = isFavorite(movie);
    const movieKey = `${movie.title}_${movie.year}`;
    
    return `
        <div class="bg-[#121212] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all group cursor-pointer" onclick="viewMovieFromHistory('${movieKey}')">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">${movie.title}</h3>
                    <div class="flex items-center gap-3 text-sm text-gray-400">
                        <span>${movie.year}</span>
                        <span>•</span>
                        <span class="text-orange-400 font-bold">IMDb ${movie.rating}</span>
                    </div>
                </div>
                ${isFav ? '<i data-lucide="heart" class="text-red-500 fill-current" width="18"></i>' : ''}
            </div>
            <p class="text-gray-400 text-sm mb-3 italic">"${movie.desc}"</p>
            <div class="flex items-center justify-between text-xs text-gray-500">
                <span class="px-2 py-1 bg-white/5 rounded">${movie.genre}</span>
                <span>Viewed ${dateStr}</span>
            </div>
        </div>
    `;
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
    if (!state.customMood.trim()) {
        alert("Please describe what kind of movie you're looking for!");
        return;
    }
    
    if (!API_READY) {
        alert("API not ready. Please wait a moment and try again.");
        return;
    }
    
    state.isLoading = true;
    render();
    
    const prompt = `Recommend ONE movie based on this mood/request: "${state.customMood}". 

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Movie Title",
  "year": "YYYY",
  "rating": "X.X",
  "desc": "Brief description"
}

Do not include any markdown formatting, code blocks, or extra text. Just the JSON object.`;

    let resultText = null;
    try {
        resultText = await callGemini(prompt);
        
        if (!resultText) {
            throw new Error("No response from AI. Please check your API key and try again.");
        }
        
        // Clean up the response - remove markdown code blocks if present
        let cleanJson = resultText.trim();
        cleanJson = cleanJson.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // Try to extract JSON if it's embedded in text
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanJson = jsonMatch[0];
        }
        
        const movie = JSON.parse(cleanJson);
        
        // Validate required fields
        if (!movie.title || !movie.year) {
            throw new Error("Invalid movie data received from AI");
        }
        
        // Ensure all fields exist with defaults
        state.movie = {
            title: movie.title,
            year: movie.year || "Unknown",
            rating: movie.rating || "N/A",
            desc: movie.desc || "No description available"
        };
        
        state.selectedGenre = 'AI Choice';
        state.aiHype = null;
        state.step = 'result';
    } catch (e) {
        console.error("Error parsing AI response:", e);
        if (resultText) {
            console.error("Raw response:", resultText);
        }
        const errorMsg = e.message || "Unknown error occurred";
        alert(`Failed to get movie recommendation: ${errorMsg}. Please try again with a different description.`);
    } finally {
        state.isLoading = false;
        render();
    }
}

async function generateHype() {
    if (!state.movie) return;
    
    if (!API_READY) {
        alert("API not ready. Please wait a moment and try again.");
        return;
    }
    
    state.isHypeLoading = true;
    render();
    
    const prompt = `Give me a short, exciting hype pitch (2-3 sentences) for the movie "${state.movie.title}" (${state.movie.year}). Make it engaging and make me want to watch it!`;
    
    try {
        const hype = await callGemini(prompt);
        if (hype) {
            state.aiHype = hype.trim();
        } else {
            throw new Error("No response from AI");
        }
    } catch (e) {
        console.error("Error generating hype:", e);
        alert(`Failed to generate hype. Please try again.`);
    } finally {
        state.isHypeLoading = false;
        render();
    }
}

function toggleFavorite() {
    if (!state.movie) return;
    
    const isFav = isFavorite(state.movie);
    
    if (isFav) {
        const movieId = getMovieId(state.movie);
        if (movieId) {
            removeFromFavorites(movieId);
        }
    } else {
        const added = addToFavorites(state.movie);
        if (added) {
            // Show a brief notification
            showNotification('Added to favorites! ❤️');
        }
    }
    
    render();
}

function removeFavorite(movieId) {
    removeFromFavorites(movieId);
    showNotification('Removed from favorites');
    render();
}

function clearAllFavorites() {
    if (confirm('Are you sure you want to remove all favorites?')) {
        localStorage.removeItem('gemi_favorites');
        showNotification('All favorites cleared');
        render();
    }
}

function clearWatchHistory() {
    if (confirm('Are you sure you want to clear watch history?')) {
        localStorage.removeItem('gemi_watch_history');
        showNotification('Watch history cleared');
        render();
    }
}

function showNotification(message) {
    // Create a simple notification toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function reset() {
    state.step = 'genre';
    state.selectedGenre = null;
    state.movie = null;
    state.customMood = '';
    state.aiHype = null;
    render();
}

function showMyList() {
    state.step = 'mylist';
    render();
}

function viewMovieFromFavorites(movieId) {
    const favorites = getFavorites();
    const movie = favorites.find(fav => fav.id === movieId);
    if (movie) {
        state.movie = movie;
        state.selectedGenre = movie.genre || 'Unknown';
        state.step = 'result';
        state.aiHype = null;
        render();
    }
}

function viewMovieFromHistory(movieKey) {
    const history = getWatchHistory();
    // Find movie by matching the key pattern (title_year)
    const movie = history.find(h => {
        const key = `${h.title}_${h.year}`;
        return key === movieKey;
    });
    if (movie) {
        state.movie = movie;
        state.selectedGenre = movie.genre || 'Unknown';
        state.step = 'result';
        state.aiHype = null;
        render();
    }
}

// Start app - Initialize API key first
initializeAPIKey().then(() => {
    render();
});