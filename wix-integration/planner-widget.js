/**
 * London Day Planner - Wix Studio Integration Widget
 * 
 * Drop this into your Wix Studio city pages to enable itinerary planning
 * Usage: Include this script and call initializePlanner(citySlug) 
 */

class DayPlannerWidget {
    constructor(citySlug, containerId = 'day-planner-widget') {
        this.city = citySlug;
        this.apiUrl = 'https://api.planyourperfectday.app';
        this.containerId = containerId;
        this.isLoading = false;
        
        // City configurations
        this.cityConfigs = {
            'london': {
                name: 'London',
                timezone: 'Europe/London',
                emoji: '🇬🇧',
                examples: [
                    'Traditional afternoon tea in Mayfair at 3pm',
                    'Fish and chips near Big Ben, then a West End show',
                    'Coffee in Covent Garden, then visit Tate Modern'
                ]
            },
            'nyc': {
                name: 'New York City', 
                timezone: 'America/New_York',
                emoji: '🗽',
                examples: [
                    'Coffee in Greenwich Village, then visit MoMA',
                    'Pizza in Little Italy, then rooftop bar with skyline views',
                    'Central Park walk, then lunch in Midtown'
                ]
            },
            'boston': {
                name: 'Boston',
                timezone: 'America/New_York', 
                emoji: '🦞',
                examples: [
                    'Clam chowder in North End, then Freedom Trail tour',
                    'Coffee near Harvard, then lunch in Back Bay',
                    'Lobster roll by the harbor, then brewery in South End'
                ]
            },
            'austin': {
                name: 'Austin',
                timezone: 'America/Chicago',
                emoji: '🤠', 
                examples: [
                    'BBQ food truck, then live music on 6th Street',
                    'Coffee in South Austin, then tacos for lunch',
                    'Breakfast burrito, then explore Zilker Park'
                ]
            }
        };
        
        this.init();
    }
    
    async init() {
        this.renderWidget();
        this.attachEventListeners();
        this.setDefaultDate();
    }
    
    getCityConfig() {
        return this.cityConfigs[this.city] || {
            name: this.city.toUpperCase(),
            timezone: 'America/New_York',
            emoji: '🌟',
            examples: ['Explore the best of ' + this.city]
        };
    }
    
    renderWidget() {
        const container = document.getElementById(this.containerId);
        const cityConfig = this.getCityConfig();
        
        if (!container) {
            console.error(`Container with ID '${this.containerId}' not found`);
            return;
        }
        
        container.innerHTML = `
            <div class="day-planner-widget">
                <style>
                    .day-planner-widget {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 2rem;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 20px;
                        color: white;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                    }
                    
                    .planner-header {
                        text-align: center;
                        margin-bottom: 2rem;
                    }
                    
                    .planner-header h1 {
                        font-size: 2.5rem;
                        margin: 0 0 0.5rem 0;
                        font-weight: 700;
                    }
                    
                    .planner-header p {
                        font-size: 1.2rem;
                        opacity: 0.9;
                        margin: 0;
                    }
                    
                    .planning-form {
                        background: rgba(255,255,255,0.1);
                        padding: 2rem;
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                        margin-bottom: 2rem;
                    }
                    
                    .form-group {
                        margin-bottom: 1.5rem;
                    }
                    
                    .form-group label {
                        display: block;
                        margin-bottom: 0.5rem;
                        font-weight: 600;
                        font-size: 1.1rem;
                    }
                    
                    .query-input {
                        width: 100%;
                        padding: 1rem;
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        background: rgba(255,255,255,0.9);
                        color: #333;
                        resize: vertical;
                        min-height: 100px;
                        box-sizing: border-box;
                    }
                    
                    .query-input::placeholder {
                        color: #666;
                    }
                    
                    .datetime-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1rem;
                    }
                    
                    .datetime-input {
                        padding: 1rem;
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        background: rgba(255,255,255,0.9);
                        color: #333;
                        box-sizing: border-box;
                    }
                    
                    .examples-section {
                        margin-bottom: 1.5rem;
                    }
                    
                    .examples-grid {
                        display: grid;
                        gap: 0.5rem;
                    }
                    
                    .example-suggestion {
                        background: rgba(255,255,255,0.2);
                        border: none;
                        padding: 0.75rem 1rem;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                        text-align: left;
                        font-size: 0.9rem;
                        transition: background 0.2s;
                    }
                    
                    .example-suggestion:hover {
                        background: rgba(255,255,255,0.3);
                    }
                    
                    .plan-button {
                        width: 100%;
                        padding: 1.2rem 2rem;
                        background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                        border: none;
                        border-radius: 12px;
                        color: white;
                        font-size: 1.2rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    
                    .plan-button:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    }
                    
                    .plan-button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                    }
                    
                    .loading-spinner {
                        display: inline-block;
                        width: 20px;
                        height: 20px;
                        border: 2px solid rgba(255,255,255,0.3);
                        border-radius: 50%;
                        border-top-color: white;
                        animation: spin 1s ease-in-out infinite;
                        margin-right: 0.5rem;
                    }
                    
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    
                    .results-section {
                        background: white;
                        color: #333;
                        padding: 2rem;
                        border-radius: 15px;
                        margin-top: 2rem;
                    }
                    
                    .venue-card {
                        background: #f8f9fa;
                        border-radius: 12px;
                        padding: 1.5rem;
                        margin-bottom: 1rem;
                        border-left: 4px solid #667eea;
                    }
                    
                    .venue-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 1rem;
                    }
                    
                    .venue-name {
                        font-size: 1.3rem;
                        font-weight: 600;
                        color: #2c3e50;
                    }
                    
                    .venue-time {
                        background: #667eea;
                        color: white;
                        padding: 0.3rem 0.8rem;
                        border-radius: 20px;
                        font-weight: 500;
                        font-size: 0.9rem;
                    }
                    
                    .venue-details {
                        font-size: 0.95rem;
                        color: #666;
                        line-height: 1.5;
                    }
                    
                    .venue-rating {
                        color: #f39c12;
                        font-weight: 600;
                    }
                    
                    .error-message {
                        background: #ff6b6b;
                        color: white;
                        padding: 1rem;
                        border-radius: 10px;
                        margin-top: 1rem;
                    }
                    
                    @media (max-width: 768px) {
                        .day-planner-widget {
                            padding: 1.5rem;
                        }
                        
                        .planner-header h1 {
                            font-size: 2rem;
                        }
                        
                        .datetime-row {
                            grid-template-columns: 1fr;
                        }
                    }
                </style>
                
                <div class="planner-header">
                    <h1>${cityConfig.emoji} Plan Your Perfect Day in ${cityConfig.name}</h1>
                    <p>Create a personalized itinerary with AI-powered recommendations</p>
                </div>
                
                <form class="planning-form" id="planning-form">
                    <div class="form-group">
                        <label for="query-input">What would you like to do today?</label>
                        <textarea 
                            id="query-input" 
                            class="query-input" 
                            placeholder="Describe your perfect day... e.g., 'Coffee and pastries at 10am, then visit a museum, followed by lunch at a nice restaurant'"
                            required
                        ></textarea>
                    </div>
                    
                    <div class="examples-section">
                        <label>💡 Need inspiration? Try these ideas:</label>
                        <div class="examples-grid">
                            ${cityConfig.examples.map(example => 
                                `<button type="button" class="example-suggestion" data-example="${example}">
                                    ${example}
                                </button>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <div class="datetime-row">
                            <div>
                                <label for="date-input">Date</label>
                                <input type="date" id="date-input" class="datetime-input" required>
                            </div>
                            <div>
                                <label for="time-input">Start Time (optional)</label>
                                <input type="time" id="time-input" class="datetime-input">
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="plan-button" id="plan-button">
                        <span id="button-text">✨ Create My Perfect Day</span>
                    </button>
                </form>
                
                <div id="results-container"></div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const form = document.getElementById('planning-form');
        const queryInput = document.getElementById('query-input');
        const exampleButtons = document.querySelectorAll('.example-suggestion');
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createItinerary();
        });
        
        // Handle example suggestions
        exampleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const example = button.dataset.example;
                queryInput.value = example;
                queryInput.focus();
            });
        });
    }
    
    setDefaultDate() {
        const dateInput = document.getElementById('date-input');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    async createItinerary() {
        if (this.isLoading) return;
        
        const queryInput = document.getElementById('query-input');
        const dateInput = document.getElementById('date-input');
        const timeInput = document.getElementById('time-input');
        const button = document.getElementById('plan-button');
        const buttonText = document.getElementById('button-text');
        const resultsContainer = document.getElementById('results-container');
        
        const query = queryInput.value.trim();
        const date = dateInput.value;
        const startTime = timeInput.value || undefined;
        
        if (!query || !date) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        // Show loading state
        this.isLoading = true;
        button.disabled = true;
        buttonText.innerHTML = '<span class="loading-spinner"></span>Creating your perfect day...';
        resultsContainer.innerHTML = '';
        
        try {
            const response = await fetch(`${this.apiUrl}/api/${this.city}/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, date, startTime })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
            
            const itinerary = await response.json();
            this.renderItinerary(itinerary);
            
            // Track analytics if available
            if (typeof gtag !== 'undefined') {
                gtag('event', 'itinerary_created', {
                    'city': this.city,
                    'venues_count': itinerary.venues?.length || 0,
                    'query_complexity': itinerary.meta?.complexity?.level || 'unknown'
                });
            }
            
        } catch (error) {
            console.error('Error creating itinerary:', error);
            this.showError(error.message || 'Sorry, something went wrong. Please try again.');
        } finally {
            this.isLoading = false;
            button.disabled = false;
            buttonText.innerHTML = '✨ Create My Perfect Day';
        }
    }
    
    renderItinerary(itinerary) {
        const resultsContainer = document.getElementById('results-container');
        const cityConfig = this.getCityConfig();
        
        if (!itinerary.venues || itinerary.venues.length === 0) {
            this.showError('No venues found for your request. Try being more specific or choose a different date.');
            return;
        }
        
        const venuesHtml = itinerary.venues.map((venue, index) => `
            <div class="venue-card">
                <div class="venue-header">
                    <div class="venue-name">${index + 1}. ${venue.name}</div>
                    <div class="venue-time">${venue.time}</div>
                </div>
                <div class="venue-details">
                    📍 ${venue.address}<br>
                    ${venue.rating > 0 ? `<span class="venue-rating">⭐ ${venue.rating}/5.0</span>` : ''}
                    ${venue.categories && venue.categories.length > 0 ? ` • ${venue.categories.slice(0, 3).join(' • ')}` : ''}
                    ${venue.alternatives && venue.alternatives.length > 0 ? `<br>🔄 ${venue.alternatives.length} alternative options available` : ''}
                </div>
            </div>
        `).join('');
        
        resultsContainer.innerHTML = `
            <div class="results-section">
                <h2>${cityConfig.emoji} Your Perfect Day in ${cityConfig.name}</h2>
                <p><strong>📅 ${new Date(itinerary.date || Date.now()).toLocaleDateString()}</strong></p>
                ${venuesHtml}
                ${itinerary.meta?.complexity ? `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: #e8f4f8; border-radius: 8px; font-size: 0.9rem;">
                        🧠 <strong>AI Analysis:</strong> ${itinerary.meta.complexity.level} complexity query 
                        (${itinerary.meta.complexity.score}/100) • 
                        Processed in ${itinerary.meta.complexity.processingTime || 'optimal'} time
                    </div>
                ` : ''}
            </div>
        `;
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    showError(message) {
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = `
            <div class="error-message">
                ❌ ${message}
            </div>
        `;
    }
}

// Global initialization function
window.initializeDayPlanner = function(citySlug, containerId = 'day-planner-widget') {
    return new DayPlannerWidget(citySlug, containerId);
};

// Auto-initialize if city is in URL path
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    const cityMatch = path.match(/\/(london|nyc|boston|austin)/);
    
    if (cityMatch && document.getElementById('day-planner-widget')) {
        window.initializeDayPlanner(cityMatch[1]);
    }
});