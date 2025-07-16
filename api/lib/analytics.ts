import { IStorage } from '../storage';
import { MemoryCache } from './cache';

interface AnalyticsMetric {
  id: string;
  type: 'query' | 'venue' | 'city' | 'time' | 'feature';
  value: string;
  count: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface VenuePopularity {
  placeId: string;
  name: string;
  category: string;
  visitCount: number;
  averageRating?: number;
  city: string;
}

interface QueryPattern {
  pattern: string;
  count: number;
  examples: string[];
  commonActivities: string[];
}

interface TimePreference {
  hour: number;
  dayOfWeek: number;
  count: number;
}

export class AnalyticsService {
  private storage: IStorage;
  private cache: MemoryCache;
  private metrics: Map<string, AnalyticsMetric>;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.cache = new MemoryCache();
    this.metrics = new Map();
  }

  /**
   * Track a user query
   */
  async trackQuery(query: string, city: string, userId?: string): Promise<void> {
    const key = `query:${query.toLowerCase()}:${city}`;
    const existing = this.metrics.get(key);
    
    if (existing) {
      existing.count++;
      existing.timestamp = new Date();
    } else {
      this.metrics.set(key, {
        id: key,
        type: 'query',
        value: query,
        count: 1,
        metadata: { city, userId },
        timestamp: new Date()
      });
    }

    // Extract and track patterns
    this.extractQueryPatterns(query, city);
  }

  /**
   * Track venue selection
   */
  async trackVenueSelection(
    placeId: string, 
    name: string, 
    category: string,
    city: string,
    rating?: number
  ): Promise<void> {
    const key = `venue:${placeId}`;
    const existing = this.metrics.get(key);
    
    if (existing) {
      existing.count++;
      existing.timestamp = new Date();
      if (rating && existing.metadata) {
        existing.metadata.totalRating = (existing.metadata.totalRating || 0) + rating;
        existing.metadata.ratingCount = (existing.metadata.ratingCount || 0) + 1;
      }
    } else {
      this.metrics.set(key, {
        id: key,
        type: 'venue',
        value: name,
        count: 1,
        metadata: { 
          placeId, 
          category, 
          city,
          totalRating: rating || 0,
          ratingCount: rating ? 1 : 0
        },
        timestamp: new Date()
      });
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(feature: string, metadata?: any): Promise<void> {
    const key = `feature:${feature}`;
    const existing = this.metrics.get(key);
    
    if (existing) {
      existing.count++;
      existing.timestamp = new Date();
    } else {
      this.metrics.set(key, {
        id: key,
        type: 'feature',
        value: feature,
        count: 1,
        metadata,
        timestamp: new Date()
      });
    }
  }

  /**
   * Track time preferences
   */
  async trackTimePreference(hour: number, dayOfWeek: number): Promise<void> {
    const key = `time:${hour}:${dayOfWeek}`;
    const existing = this.metrics.get(key);
    
    if (existing) {
      existing.count++;
      existing.timestamp = new Date();
    } else {
      this.metrics.set(key, {
        id: key,
        type: 'time',
        value: `${hour}:${dayOfWeek}`,
        count: 1,
        metadata: { hour, dayOfWeek },
        timestamp: new Date()
      });
    }
  }

  /**
   * Get most popular venues
   */
  async getPopularVenues(city?: string, limit: number = 10): Promise<VenuePopularity[]> {
    const cacheKey = `analytics:popular-venues:${city || 'all'}`;
    
    return this.cache.getOrSet(cacheKey, async () => {
      const venues = Array.from(this.metrics.values())
        .filter(m => m.type === 'venue' && (!city || m.metadata?.city === city))
        .map(m => ({
          placeId: m.metadata?.placeId || '',
          name: m.value,
          category: m.metadata?.category || '',
          visitCount: m.count,
          averageRating: m.metadata?.ratingCount > 0 
            ? m.metadata.totalRating / m.metadata.ratingCount 
            : undefined,
          city: m.metadata?.city || ''
        }))
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, limit);
      
      return venues;
    }, 60 * 60 * 1000); // Cache for 1 hour
  }

  /**
   * Get common query patterns
   */
  async getQueryPatterns(city?: string, limit: number = 10): Promise<QueryPattern[]> {
    const queries = Array.from(this.metrics.values())
      .filter(m => m.type === 'query' && (!city || m.metadata?.city === city));
    
    // Group by patterns (simplified pattern matching)
    const patterns = new Map<string, QueryPattern>();
    
    queries.forEach(query => {
      // Extract pattern (very simplified - in production, use NLP)
      const pattern = this.extractPattern(query.value);
      
      if (patterns.has(pattern)) {
        const existing = patterns.get(pattern)!;
        existing.count += query.count;
        if (existing.examples.length < 5) {
          existing.examples.push(query.value);
        }
      } else {
        patterns.set(pattern, {
          pattern,
          count: query.count,
          examples: [query.value],
          commonActivities: this.extractActivities(query.value)
        });
      }
    });
    
    return Array.from(patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get time preferences heatmap
   */
  async getTimePreferences(): Promise<TimePreference[]> {
    const timeMetrics = Array.from(this.metrics.values())
      .filter(m => m.type === 'time')
      .map(m => ({
        hour: m.metadata?.hour || 0,
        dayOfWeek: m.metadata?.dayOfWeek || 0,
        count: m.count
      }));
    
    return timeMetrics.sort((a, b) => b.count - a.count);
  }

  /**
   * Get feature usage stats
   */
  async getFeatureUsage(): Promise<Record<string, number>> {
    const features = Array.from(this.metrics.values())
      .filter(m => m.type === 'feature');
    
    const usage: Record<string, number> = {};
    features.forEach(f => {
      usage[f.value] = f.count;
    });
    
    return usage;
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(city?: string) {
    const [popularVenues, queryPatterns, timePreferences, featureUsage] = await Promise.all([
      this.getPopularVenues(city),
      this.getQueryPatterns(city),
      this.getTimePreferences(),
      this.getFeatureUsage()
    ]);

    const totalQueries = Array.from(this.metrics.values())
      .filter(m => m.type === 'query' && (!city || m.metadata?.city === city))
      .reduce((sum, m) => sum + m.count, 0);

    const totalVenueVisits = Array.from(this.metrics.values())
      .filter(m => m.type === 'venue' && (!city || m.metadata?.city === city))
      .reduce((sum, m) => sum + m.count, 0);

    return {
      summary: {
        totalQueries,
        totalVenueVisits,
        uniqueVenues: popularVenues.length,
        mostPopularTime: timePreferences[0] || null
      },
      popularVenues,
      queryPatterns,
      timePreferences,
      featureUsage
    };
  }

  /**
   * Extract query patterns (simplified)
   */
  private extractPattern(query: string): string {
    const normalized = query.toLowerCase();
    
    // Common patterns
    if (normalized.includes('lunch') || normalized.includes('dinner') || normalized.includes('breakfast')) {
      return 'meal-based';
    }
    if (normalized.includes('museum') || normalized.includes('art') || normalized.includes('culture')) {
      return 'cultural';
    }
    if (normalized.includes('shop') || normalized.includes('buy')) {
      return 'shopping';
    }
    if (normalized.includes('night') || normalized.includes('club') || normalized.includes('bar')) {
      return 'nightlife';
    }
    if (normalized.includes('park') || normalized.includes('outdoor') || normalized.includes('nature')) {
      return 'outdoor';
    }
    
    return 'general';
  }

  /**
   * Extract activities from query
   */
  private extractActivities(query: string): string[] {
    const activities: string[] = [];
    const normalized = query.toLowerCase();
    
    const activityKeywords = [
      'lunch', 'dinner', 'breakfast', 'coffee', 'tea',
      'museum', 'art', 'gallery', 'exhibition',
      'shopping', 'shop', 'market', 'store',
      'park', 'walk', 'outdoor', 'nature',
      'bar', 'club', 'drinks', 'nightlife',
      'show', 'theatre', 'concert', 'music'
    ];
    
    activityKeywords.forEach(keyword => {
      if (normalized.includes(keyword)) {
        activities.push(keyword);
      }
    });
    
    return activities;
  }

  /**
   * Extract patterns from queries
   */
  private extractQueryPatterns(query: string, city: string): void {
    // Track time patterns
    const timeMatch = query.match(/(\d{1,2})\s*(am|pm|AM|PM)/g);
    if (timeMatch) {
      timeMatch.forEach(time => {
        const hour = this.parseHour(time);
        if (hour !== null) {
          const dayOfWeek = new Date().getDay();
          this.trackTimePreference(hour, dayOfWeek);
        }
      });
    }

    // Track activity types
    const activities = this.extractActivities(query);
    activities.forEach(activity => {
      this.trackFeatureUsage(`activity:${activity}`, { city });
    });
  }

  /**
   * Parse hour from time string
   */
  private parseHour(timeStr: string): number | null {
    const match = timeStr.match(/(\d{1,2})\s*(am|pm|AM|PM)/);
    if (!match) return null;
    
    let hour = parseInt(match[1]);
    const isPM = match[2].toLowerCase() === 'pm';
    
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    
    return hour;
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(): Promise<string> {
    const data = await this.getDashboardData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear old metrics (cleanup)
   */
  async cleanupOldMetrics(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    Array.from(this.metrics.entries()).forEach(([key, metric]) => {
      if (metric.timestamp < cutoffDate) {
        this.metrics.delete(key);
      }
    });
  }
}

// Singleton instance
let analyticsInstance: AnalyticsService | null = null;

export function getAnalytics(storage: IStorage): AnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsService(storage);
  }
  return analyticsInstance;
}