/**
 * UserPreferencesService - Memory system for premium users
 *
 * Stores and retrieves user preferences to personalize AI recommendations.
 * Premium users get personalized prompts based on their history and preferences.
 */

export interface UserPreferences {
  userId: string;
  isPremium: boolean;
  subscriptionTier: 'free' | 'monthly' | 'annual';
  subscriptionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Learned preferences
  preferences: {
    favoriteNeighborhoods: string[];
    cuisinePreferences: string[];
    ambiencePreferences: AmbienceType[];
    avoidCategories: string[];
    typicalBudget: BudgetLevel;
    preferredTimes: TimePreference[];
  };

  // Interaction history
  history: {
    likedVenues: VenueInteraction[];
    dislikedVenues: VenueInteraction[];
    searchHistory: SearchHistoryItem[];
    visitedCities: string[];
  };

  // App settings
  settings: {
    language: string;
    defaultCity: string;
    weatherAwareEnabled: boolean;
    notificationsEnabled: boolean;
  };
}

export type AmbienceType = 'quiet' | 'lively' | 'cozy' | 'upscale' | 'casual' | 'romantic' | 'family-friendly';
export type BudgetLevel = 'budget' | 'moderate' | 'expensive' | 'luxury';

export interface TimePreference {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  preferredStartTime: string; // HH:mm format
  preferredEndTime: string;
}

export interface VenueInteraction {
  venueId: string;
  venueName: string;
  categories: string[];
  neighborhood: string;
  city: string;
  rating: number;
  interactedAt: Date;
  source: 'explicit' | 'implicit'; // explicit = user clicked like/dislike, implicit = inferred from behavior
}

export interface SearchHistoryItem {
  query: string;
  city: string;
  tier: 'simple' | 'detailed' | 'complex';
  timestamp: Date;
  resultCount: number;
}

/**
 * In-memory store for development. In production, this would be backed by a database.
 */
const userPreferencesStore = new Map<string, UserPreferences>();

export class UserPreferencesService {
  /**
   * Get user preferences by user ID
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    return userPreferencesStore.get(userId) || null;
  }

  /**
   * Create or update user preferences
   */
  async savePreferences(preferences: UserPreferences): Promise<void> {
    preferences.updatedAt = new Date();
    userPreferencesStore.set(preferences.userId, preferences);
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    const defaultPrefs: UserPreferences = {
      userId,
      isPremium: false,
      subscriptionTier: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        favoriteNeighborhoods: [],
        cuisinePreferences: [],
        ambiencePreferences: [],
        avoidCategories: [],
        typicalBudget: 'moderate',
        preferredTimes: [],
      },
      history: {
        likedVenues: [],
        dislikedVenues: [],
        searchHistory: [],
        visitedCities: [],
      },
      settings: {
        language: 'en',
        defaultCity: 'london',
        weatherAwareEnabled: true,
        notificationsEnabled: false,
      },
    };

    await this.savePreferences(defaultPrefs);
    return defaultPrefs;
  }

  /**
   * Update subscription status
   */
  async updateSubscription(
    userId: string,
    tier: 'free' | 'monthly' | 'annual',
    expiresAt?: Date
  ): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return;

    prefs.isPremium = tier !== 'free';
    prefs.subscriptionTier = tier;
    prefs.subscriptionExpiresAt = expiresAt;
    await this.savePreferences(prefs);
  }

  /**
   * Record a venue interaction (like or dislike)
   */
  async recordVenueInteraction(
    userId: string,
    venue: Omit<VenueInteraction, 'interactedAt' | 'source'>,
    liked: boolean
  ): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return;

    const interaction: VenueInteraction = {
      ...venue,
      interactedAt: new Date(),
      source: 'explicit',
    };

    if (liked) {
      // Add to liked, remove from disliked if present
      prefs.history.likedVenues = [
        interaction,
        ...prefs.history.likedVenues.filter((v) => v.venueId !== venue.venueId),
      ].slice(0, 100); // Keep last 100
      prefs.history.dislikedVenues = prefs.history.dislikedVenues.filter(
        (v) => v.venueId !== venue.venueId
      );

      // Update learned preferences based on liked venue
      this.updateLearnedPreferences(prefs, venue, 'positive');
    } else {
      // Add to disliked, remove from liked if present
      prefs.history.dislikedVenues = [
        interaction,
        ...prefs.history.dislikedVenues.filter((v) => v.venueId !== venue.venueId),
      ].slice(0, 100);
      prefs.history.likedVenues = prefs.history.likedVenues.filter(
        (v) => v.venueId !== venue.venueId
      );

      // Update learned preferences based on disliked venue
      this.updateLearnedPreferences(prefs, venue, 'negative');
    }

    await this.savePreferences(prefs);
  }

  /**
   * Record a search query
   */
  async recordSearch(
    userId: string,
    query: string,
    city: string,
    tier: 'simple' | 'detailed' | 'complex',
    resultCount: number
  ): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return;

    prefs.history.searchHistory = [
      {
        query,
        city,
        tier,
        timestamp: new Date(),
        resultCount,
      },
      ...prefs.history.searchHistory,
    ].slice(0, 50); // Keep last 50 searches

    // Update visited cities
    if (!prefs.history.visitedCities.includes(city)) {
      prefs.history.visitedCities.push(city);
    }

    await this.savePreferences(prefs);
  }

  /**
   * Get an enhanced prompt with user preferences for premium users
   */
  async getEnhancedPrompt(userId: string, basePrompt: string): Promise<string> {
    const prefs = await this.getPreferences(userId);

    // Only enhance for premium users
    if (!prefs?.isPremium) {
      return basePrompt;
    }

    // Build preference context
    const preferenceContext = this.buildPreferenceContext(prefs);

    if (!preferenceContext) {
      return basePrompt;
    }

    return `${basePrompt}

USER PREFERENCES (personalize recommendations based on these):
${preferenceContext}

IMPORTANT: Use these preferences to rank and filter recommendations. Prioritize venues that match the user's established preferences while still respecting the specific requirements in their current query.`;
  }

  /**
   * Build a preference context string from user data
   */
  private buildPreferenceContext(prefs: UserPreferences): string | null {
    const parts: string[] = [];

    // Favorite neighborhoods
    if (prefs.preferences.favoriteNeighborhoods.length > 0) {
      parts.push(
        `- Favorite areas: ${prefs.preferences.favoriteNeighborhoods.slice(0, 5).join(', ')}`
      );
    }

    // Cuisine preferences
    if (prefs.preferences.cuisinePreferences.length > 0) {
      parts.push(
        `- Cuisine preferences: ${prefs.preferences.cuisinePreferences.slice(0, 5).join(', ')}`
      );
    }

    // Ambience preferences
    if (prefs.preferences.ambiencePreferences.length > 0) {
      parts.push(
        `- Preferred ambience: ${prefs.preferences.ambiencePreferences.join(', ')}`
      );
    }

    // Budget
    if (prefs.preferences.typicalBudget !== 'moderate') {
      parts.push(`- Budget preference: ${prefs.preferences.typicalBudget}`);
    }

    // Recently liked venues (for context)
    const recentLikes = prefs.history.likedVenues.slice(0, 5);
    if (recentLikes.length > 0) {
      parts.push(
        `- Recently enjoyed: ${recentLikes.map((v) => v.venueName).join(', ')}`
      );
    }

    // Things to avoid
    if (prefs.preferences.avoidCategories.length > 0) {
      parts.push(
        `- Prefers to avoid: ${prefs.preferences.avoidCategories.join(', ')}`
      );
    }

    // Recent dislikes (to avoid similar)
    const recentDislikes = prefs.history.dislikedVenues.slice(0, 3);
    if (recentDislikes.length > 0) {
      parts.push(
        `- Recently disliked (avoid similar): ${recentDislikes.map((v) => v.venueName).join(', ')}`
      );
    }

    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Update learned preferences based on a venue interaction
   */
  private updateLearnedPreferences(
    prefs: UserPreferences,
    venue: Omit<VenueInteraction, 'interactedAt' | 'source'>,
    signal: 'positive' | 'negative'
  ): void {
    if (signal === 'positive') {
      // Learn from liked venues
      if (venue.neighborhood && !prefs.preferences.favoriteNeighborhoods.includes(venue.neighborhood)) {
        // Add neighborhood if liked multiple times
        const neighborhoodLikes = prefs.history.likedVenues.filter(
          (v) => v.neighborhood === venue.neighborhood
        ).length;
        if (neighborhoodLikes >= 2) {
          prefs.preferences.favoriteNeighborhoods.push(venue.neighborhood);
        }
      }

      // Learn cuisine preferences from categories
      venue.categories.forEach((cat) => {
        if (this.isCuisineCategory(cat) && !prefs.preferences.cuisinePreferences.includes(cat)) {
          const categoryLikes = prefs.history.likedVenues.filter((v) =>
            v.categories.includes(cat)
          ).length;
          if (categoryLikes >= 2) {
            prefs.preferences.cuisinePreferences.push(cat);
          }
        }
      });
    } else {
      // Learn from disliked venues
      venue.categories.forEach((cat) => {
        const categoryDislikes = prefs.history.dislikedVenues.filter((v) =>
          v.categories.includes(cat)
        ).length;
        if (categoryDislikes >= 3 && !prefs.preferences.avoidCategories.includes(cat)) {
          prefs.preferences.avoidCategories.push(cat);
        }
      });
    }
  }

  /**
   * Check if a category is a cuisine type
   */
  private isCuisineCategory(category: string): boolean {
    const cuisineKeywords = [
      'italian',
      'french',
      'japanese',
      'chinese',
      'mexican',
      'indian',
      'thai',
      'vietnamese',
      'korean',
      'mediterranean',
      'american',
      'british',
      'spanish',
      'greek',
      'middle eastern',
      'sushi',
      'pizza',
      'burger',
      'seafood',
      'vegetarian',
      'vegan',
    ];

    return cuisineKeywords.some((kw) => category.toLowerCase().includes(kw));
  }

  /**
   * Get the AI model to use based on subscription tier
   */
  getModelForUser(
    classification: { tier: 'simple' | 'detailed' | 'complex'; model: string },
    isPremium: boolean
  ): string {
    if (isPremium) {
      // Premium users always get the Pro model
      return 'gemini-1.5-pro';
    }
    // Free users get the model based on query complexity
    return classification.model;
  }

  /**
   * Check if subscription is still valid
   */
  isSubscriptionValid(prefs: UserPreferences): boolean {
    if (!prefs.isPremium) return false;
    if (!prefs.subscriptionExpiresAt) return true; // No expiry set
    return new Date() < prefs.subscriptionExpiresAt;
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();
