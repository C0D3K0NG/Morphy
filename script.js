// --- CONFIGURATION ---
let API_READY = false;

// Random Moods for "Surprise Me"
const RANDOM_MOODS = [
    "A cyberpunk heist gone wrong with neon aesthetics",
    "A 90s rom-com that takes place in New York during Christmas",
    "A psychological thriller with a mind-bending plot twist",
    "A Ghibli-style animated movie about nature and magic",
    "A gritty western revenge story with sparse dialogue",
    "A space opera that focuses on politics and diplomacy",
    "A horror movie that takes place in a single room",
    "An inspiring sports drama based on a true story"
];

// --- INITIALIZATION ---
async function initializeAPIKey() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Server not ready');
        API_READY = true;
        console.log('✅ API ready');
    } catch (error) {
        console.error('❌ Failed to reach API:', error);
        showNotification('Cannot reach server. Ensure npm start is running.', 'error');
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
    isHypeLoading: false,
    showShortcuts: false
};

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    // Ignore shortcuts if typing in an input
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        if (e.key === 'Escape') e.target.blur(); // Allow escaping input
        return;
    }

    switch(e.key.toLowerCase()) {
        case '/':
            e.preventDefault();
            setStep('ai-input');
            break;
        case 'escape':
            if (state.showShortcuts) toggleShortcutsHelp();
            else if (state.step !== 'genre') reset();
            break;
        case 'f':
            if (state.step === 'result') toggleFavorite();
            break;
        case 'r':
            if (state.step === 'ai-input') randomMood();
            break;
        case '?':
            if (e.shiftKey) toggleShortcutsHelp();
            break;
    }
});

function toggleShortcutsHelp() {
    state.showShortcuts = !state.showShortcuts;
    const container = document.getElementById('modal-container');
    
    if (state.showShortcuts) {
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onclick="toggleShortcutsHelp()">
                <div class="glass-panel p-8 rounded-2xl max-w-md w-full relative animate-enter" onclick="event.stopPropagation()">
                    <button onclick="toggleShortcutsHelp()" class="absolute top-4 right-4 text-gray-400 hover:text-white"><i data-lucide="x"></i></button>
                    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                        <i data-lucide="keyboard" class="text-orange-500"></i> Shortcuts
                    </h2>
                    <div class="space-y-4 font-mono text-sm text-gray-300">
                        <div class="flex justify-between items-center border-b border-white/5 pb-2">
                            <span>Focus Search</span> <kbd class="bg-white/10 px-2 py-1 rounded text-white">/</kbd>
                        </div>
                        <div class="flex justify-between items-center border-b border-white/5 pb-2">
                            <span>Go Back / Close</span> <kbd class="bg-white/10 px-2 py-1 rounded text-white">Esc</kbd>
                        </div>
                        <div class="flex justify-between items-center border-b border-white/5 pb-2">
                            <span>Toggle Favorite</span> <kbd class="bg-white/10 px-2 py-1 rounded text-white">F</kbd>
                        </div>
                        <div class="flex justify-between items-center border-b border-white/5 pb-2">
                            <span>Random Mood</span> <kbd class="bg-white/10 px-2 py-1 rounded text-white">R</kbd>
                        </div>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    } else {
        container.innerHTML = '';
    }
}

// --- STORAGE ---
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('gemi_favorites') || '[]'); } 
    catch(e) { return []; }
}

function saveFavorites(data) {
    try { localStorage.setItem('gemi_favorites', JSON.stringify(data)); }
    catch(e) { showNotification('Storage full or disabled', 'error'); }
}

function addToFavorites(movie) {
    const favs = getFavorites();
    if (favs.some(f => f.title === movie.title && f.year === movie.year)) return false;
    
    favs.push({ ...movie, id: `${movie.title}_${movie.year}_${Date.now()}`, addedAt: new Date().toISOString() });
    saveFavorites(favs);
    return true;
}

function removeFromFavorites(id) {
    const favs = getFavorites().filter(f => f.id !== id);
    saveFavorites(favs);
}

function exportFavorites() {
    const favs = getFavorites();
    if (!favs.length) {
        showNotification("No favorites to export", "error");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(favs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "gemi_favorites.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Favorites exported!");
}

// --- CORE UI ---
const container = document.getElementById('app-container');

function render() {
    try {
        container.innerHTML = '';
        if (state.step === 'genre') renderGenreView();
        else if (state.step === 'ai-input') renderAiInputView();
        else if (state.step === 'result') renderResultView();
        else if (state.step === 'mylist') renderMyListView();
        
        updateNavbarBadge();
        if (window.lucide) lucide.createIcons();
        attachTooltips();
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="text-center text-red-500 py-10">Something went wrong. Please refresh.</div>`;
    }
}

function updateNavbarBadge() {
    const count = getFavorites().length;
    const badge = document.getElementById('favorites-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function showNotification(msg, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const bgClass = type === 'error' ? 'bg-red-500/90' : 'bg-orange-500/90';
    
    toast.className = `${bgClass} text-white px-6 py-3 rounded-xl shadow-lg backdrop-blur-md animate-enter text-sm font-medium flex items-center gap-2 pointer-events-auto`;
    toast.innerHTML = type === 'error' 
        ? `<i data-lucide="alert-circle" width="16"></i> ${msg}`
        : `<i data-lucide="check-circle" width="16"></i> ${msg}`;
    
    toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- VIEWS ---

function renderGenreView() {
    const genres = [
        { key: 'Action', icon: 'zap', sub: 'Adrenaline Rush' },
        { key: 'Comedy', icon: 'smile', sub: 'Good Vibes' },
        { key: 'Horror', icon: 'ghost', sub: 'Nightmares' }, // Skull to Ghost for variety
        { key: 'SciFi', icon: 'rocket', sub: 'Future World' },
        { key: 'Drama', icon: 'film', sub: 'Deep Stories' },
        { key: 'Romance', icon: 'heart', sub: 'Love & Feels' },
        { key: 'Thriller', icon: 'eye', sub: 'Edge of Seat' },
        { key: 'Fantasy', icon: 'wand-2', sub: 'Magic & Myths' }
    ];

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 animate-enter">
            <!-- Hero Mood Button -->
            <button onclick="setStep('ai-input')" class="md:col-span-4 glass-panel group relative overflow-hidden rounded-2xl p-10 text-left transition-all hover:border-orange-500/50 hover:shadow-[0_0_40px_-5px_rgba(249,115,22,0.2)] mb-4">
                <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity duration-500">
                    <i data-lucide="sparkles" class="w-32 h-32 rotate-12 text-orange-500"></i>
                </div>
                <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                        <i data-lucide="message-circle" class="text-white w-8 h-8"></i>
                    </div>
                    <div>
                        <h2 class="text-3xl font-bold text-white mb-2">Detailed Mood Search</h2>
                        <p class="text-gray-400 max-w-lg">Describe exactly what you want (e.g. "A 90s sci-fi with a plot twist").</p>
                    </div>
                    <div class="hidden md:flex ml-auto items-center gap-2 text-sm font-medium text-orange-400 group-hover:translate-x-1 transition-transform">
                        Start Here <i data-lucide="arrow-right" w="16"></i>
                    </div>
                </div>
            </button>

            <!-- Genre Grid -->
            ${genres.map((g, i) => `
                <button onclick="pickGenre('${g.key}')" class="glass-panel p-6 rounded-xl text-left hover-lift group relative overflow-hidden stagger-${i%3+1}">
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500">
                        <i data-lucide="arrow-up-right" width="16"></i>
                    </div>
                    <i data-lucide="${g.icon}" class="text-gray-400 group-hover:text-orange-500 mb-4 transition-colors w-8 h-8"></i>
                    <h3 class="font-bold text-lg text-white mb-1">${g.key}</h3>
                    <p class="text-xs text-gray-500 font-mono uppercase tracking-wider">${g.sub}</p>
                </button>
            `).join('')}
        </div>
    `;
}

function renderAiInputView() {
    container.innerHTML = `
        <div class="glass-panel rounded-2xl p-8 max-w-2xl mx-auto animate-enter relative">
            <button onclick="reset()" class="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors" data-tooltip="Close (Esc)">
                <i data-lucide="x"></i>
            </button>
            
            <h2 class="text-3xl font-bold mb-2">Describe the Vibe</h2>
            <p class="text-gray-400 mb-6 text-sm">Be specific. Even oddly specific. I can handle it.</p>
            
            <div class="relative mb-6 group">
                <textarea id="moodInput" onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleAIMoodSubmit(); }"
                    class="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-5 text-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all resize-none glass-input"
                    placeholder="Ex: 'Something satisfying where the bad guy loses...'"
                >${state.customMood}</textarea>
                <div class="absolute bottom-4 right-4 text-xs text-gray-600 group-focus-within:text-orange-500/50 transition-colors">
                    Press Enter to search
                </div>
            </div>

            <div class="flex gap-3">
                <button onclick="handleAIMoodSubmit()" id="searchBtn" class="flex-1 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
                    Find My Movie
                </button>
                <button onclick="randomMood()" class="px-6 rounded-xl border border-white/10 hover:bg-white/5 hover:text-orange-400 transition-colors" data-tooltip="Surprise Me (R)">
                    <i data-lucide="shuffle"></i>
                </button>
            </div>
        </div>
    `;
    
    // Auto-focus
    setTimeout(() => document.getElementById('moodInput')?.focus(), 100);
}

function renderSkeleton() {
    container.innerHTML = `
        <div class="glass-panel rounded-3xl p-8 max-w-4xl mx-auto animate-enter">
            <div class="flex flex-col md:flex-row gap-8">
                <!-- Poster Skeleton -->
                <div class="w-full md:w-1/3 aspect-[2/3] skeleton rounded-xl"></div>
                
                <!-- Content Skeleton -->
                <div class="flex-1 space-y-6 py-4">
                    <div class="h-12 w-3/4 skeleton rounded-lg"></div>
                    <div class="flex gap-4">
                        <div class="h-8 w-20 skeleton rounded-full"></div>
                        <div class="h-8 w-24 skeleton rounded-full"></div>
                    </div>
                    <div class="space-y-3 pt-4">
                        <div class="h-4 w-full skeleton rounded"></div>
                        <div class="h-4 w-full skeleton rounded"></div>
                        <div class="h-4 w-2/3 skeleton rounded"></div>
                    </div>
                    <div class="h-32 w-full skeleton rounded-xl mt-8 opacity-50"></div>
                </div>
            </div>
        </div>
    `;
}

function renderResultView() {
    if (state.isLoading) {
        renderSkeleton();
        return;
    }
    
    if (!state.movie) return;

    const m = state.movie;
    const isFav = isFavorite(m);
    
    // Fallbacks for data
    const cast = Array.isArray(m.cast) ? m.cast.slice(0,3).join(", ") : (m.cast || "Unknown");
    const director = m.director || "Unknown Director";
    const runtime = m.runtime || "N/A";
    const boxOffice = m.box_office || "N/A";
    const streaming = m.streaming || "Check local listings";

    container.innerHTML = `
        <div class="glass-panel rounded-3xl overflow-hidden animate-enter max-w-5xl mx-auto border-t border-white/10">
            <!-- Header Bar -->
            <div class="flex justify-between items-center p-6 bg-white/[0.02] border-b border-white/5">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span class="text-xs font-mono text-gray-500 uppercase tracking-widest">AI RECOMMENDATION</span>
                </div>
                <button onclick="reset()" class="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform">
                    Next Search <i data-lucide="chevron-right" width="14"></i>
                </button>
            </div>

            <div class="flex flex-col md:flex-row">
                <!-- Main Info -->
                <div class="p-8 md:p-12 flex-1">
                    <div class="mb-6 flex flex-wrap gap-3">
                        <span class="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-gray-300 border border-white/5">${m.year}</span>
                        <span class="px-3 py-1 bg-orange-500/10 rounded-full text-xs font-bold text-orange-400 border border-orange-500/20">IMDb ${m.rating}</span>
                        <span class="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-gray-300 border border-white/5">${runtime}</span>
                    </div>

                    <h1 class="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 mb-6 leading-tight">
                        ${m.title}
                    </h1>

                    <p class="text-lg text-gray-300 leading-relaxed mb-8 italic border-l-2 border-orange-500/50 pl-6">
                        "${m.desc}"
                    </p>

                    <!-- Meta Grid -->
                    <div class="grid grid-cols-2 gap-y-6 gap-x-4 mb-8 text-sm">
                        <div>
                            <div class="text-gray-500 text-xs uppercase tracking-wider mb-1">Director</div>
                            <div class="text-white font-medium">${director}</div>
                        </div>
                        <div>
                            <div class="text-gray-500 text-xs uppercase tracking-wider mb-1">Cast</div>
                            <div class="text-white font-medium truncate" title="${cast}">${cast}</div>
                        </div>
                        <div>
                            <div class="text-gray-500 text-xs uppercase tracking-wider mb-1">Box Office</div>
                            <div class="text-white font-medium text-green-400">${boxOffice}</div>
                        </div>
                        <div>
                            <div class="text-gray-500 text-xs uppercase tracking-wider mb-1">Streaming Estimate</div>
                            <div class="text-white font-medium text-blue-400 flex items-center gap-1">
                                <i data-lucide="tv" width="12"></i> ${streaming}
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-wrap gap-3">
                        <button onclick="toggleFavorite()" class="px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isFav ? 'bg-red-500 text-white shadow-lg shadow-red-900/20' : 'bg-white/10 hover:bg-white/20 text-white'}">
                            <i data-lucide="heart" class="${isFav ? 'fill-current' : ''}"></i> ${isFav ? 'Added' : 'Add to List'}
                        </button>
                        
                        <button onclick="watchTrailer('${m.title}', '${m.year}')" class="px-6 py-3 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2">
                            <i data-lucide="youtube"></i> Trailer
                        </button>

                        <button onclick="copyToClipboard('${m.title}')" class="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-colors" data-tooltip="Copy Title">
                            <i data-lucide="copy"></i>
                        </button>
                        
                         <button onclick="findSimilar('${m.title}')" class="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-orange-400 transition-colors" data-tooltip="More Like This">
                            <i data-lucide="wand-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderMyListView() {
    const list = getFavorites();
    container.innerHTML = `
        <div class="animate-enter max-w-5xl mx-auto">
            <div class="flex justify-between items-center mb-8">
                <button onclick="reset()" class="text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                    <i data-lucide="arrow-left"></i> Back
                </button>
                <button onclick="exportFavorites()" class="px-4 py-2 text-xs font-mono border border-white/10 rounded hover:bg-white/5 transition-colors flex items-center gap-2">
                    <i data-lucide="download" width="14"></i> Export JSON
                </button>
            </div>

            <h1 class="text-4xl font-bold mb-2">My List</h1>
            <p class="text-gray-500 mb-8">Your curated collection.</p>

            ${list.length === 0 ? `
                <div class="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <i data-lucide="film" class="w-16 h-16 text-gray-700 mx-auto mb-4"></i>
                    <p class="text-gray-500">Your list is empty. Go find some gems!</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${list.map(m => `
                        <div class="glass-panel p-5 rounded-xl hover:border-orange-500/30 transition-all group relative">
                            <button onclick="event.stopPropagation(); removeFromFavorites('${m.id}'); render();" class="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors"><i data-lucide="trash-2" width="16"></i></button>
                            <h3 class="font-bold text-xl mb-1 pr-8 text-white">${m.title}</h3>
                            <div class="flex gap-3 text-xs text-gray-400 mb-3 font-mono">
                                <span>${m.year}</span>
                                <span class="text-orange-400">${m.rating}</span>
                                <span>${m.genre || 'Saved'}</span>
                            </div>
                            <p class="text-sm text-gray-500 italic line-clamp-2">"${m.desc}"</p>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

// --- LOGIC HELPER ---
function setStep(s) { state.step = s; render(); }

function randomMood() {
    const mood = RANDOM_MOODS[Math.floor(Math.random() * RANDOM_MOODS.length)];
    state.customMood = mood;
    render(); // Re-render to show value
}

function watchTrailer(title, year) {
    const query = encodeURIComponent(`${title} ${year} trailer`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard');
}

async function handleAIMoodSubmit() {
    if (!state.customMood.trim()) return showNotification('Please describe a mood!', 'error');
    
    state.isLoading = true;
    render(); // Shows skeleton
    
    const prompt = `Recommend ONE movie for: "${state.customMood}".
    JSON format ONLY:
    {
        "title": "string",
        "year": "string",
        "rating": "string",
        "desc": "string",
        "director": "string",
        "cast": ["string", "string"],
        "runtime": "string",
        "box_office": "string",
        "streaming": "string (e.g. Netflix, Rent)"
    }`;

    try {
        const text = await callGemini(prompt);
        if(!text) throw new Error("No response");
        
        let clean = text.replace(/```json|```/g, '').trim();
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1) clean = clean.substring(start, end + 1);
        
        const data = JSON.parse(clean);
        state.movie = { ...data, genre: 'AI Choice' };
        state.step = 'result';
    } catch(e) {
        console.error(e);
        showNotification('AI failed to respond. Try again.', 'error');
    } finally {
        state.isLoading = false;
        render();
    }
}

function findSimilar(title) {
    state.customMood = `Movies exactly like ${title}`;
    state.step = 'ai-input';
    handleAIMoodSubmit();
}

function attachTooltips() {
    const els = document.querySelectorAll('[data-tooltip]');
    els.forEach(el => {
        el.title = el.getAttribute('data-tooltip'); // Native fallback for now, works well with glass UI
    });
}

// Mock DB for Genre Clicks (Quick fix to keep genre buttons working without calling AI every time if we want instant results, 
// BUT for this premium version, let's treat Genres as Prompts to get new data every time for variety)
function pickGenre(genre) {
    state.customMood = `The absolute best ${genre} movie of all time.`;
    state.step = 'ai-input';
    handleAIMoodSubmit();
}

// --- START ---
initializeAPIKey();
render();