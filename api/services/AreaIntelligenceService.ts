// @ts-nocheck
import { type LatLng, type CityConfig, type DetailedAreaInfo } from '../config/cities/types';
import { londonAreas, type LondonArea } from '../data/london-areas';

interface TravelTimeEstimate {
  walkingMinutes: number;
  transitMinutes: number;
  drivingMinutes: number;
  recommendedMode: 'walk' | 'transit' | 'driving';
  transitDetails?: {
    lines: string[];
    changes: number;
  };
}

interface AreaSuitability {
  area: DetailedAreaInfo | LondonArea;
  score: number;
  reasons: string[];
  crowdLevel: number;
  travelTime: number;
}

export class AreaIntelligenceService {
  private areaDatabase: Map<string, LondonArea>;
  private transportConnections: Map<string, Map<string, TravelTimeEstimate>>;
  
  constructor() {
    this.areaDatabase = new Map();
    this.transportConnections = new Map();
    this.initializeAreaData();
    this.initializeTransportConnections();
  }
  
  private initializeAreaData() {
    // Load London areas into the map
    londonAreas.forEach(area => {
      this.areaDatabase.set(area.name.toLowerCase(), area);
    });
  }
  
  private initializeTransportConnections() {
    // Define transport connections between major London areas
    // This would ideally come from a transport API, but we'll use realistic estimates
    
    const connections: Record<string, Record<string, Partial<TravelTimeEstimate>>> = {
      'canary wharf': {
        'mayfair': { walkingMinutes: 90, transitMinutes: 25, drivingMinutes: 20, recommendedMode: 'transit' },
        'soho': { walkingMinutes: 85, transitMinutes: 22, drivingMinutes: 18, recommendedMode: 'transit' },
        'shoreditch': { walkingMinutes: 50, transitMinutes: 15, drivingMinutes: 12, recommendedMode: 'transit' },
        'covent garden': { walkingMinutes: 80, transitMinutes: 20, drivingMinutes: 18, recommendedMode: 'transit' },
      },
      'mayfair': {
        'canary wharf': { walkingMinutes: 90, transitMinutes: 25, drivingMinutes: 20, recommendedMode: 'transit' },
        'soho': { walkingMinutes: 10, transitMinutes: 5, drivingMinutes: 8, recommendedMode: 'walk' },
        'covent garden': { walkingMinutes: 15, transitMinutes: 8, drivingMinutes: 10, recommendedMode: 'walk' },
        'shoreditch': { walkingMinutes: 45, transitMinutes: 18, drivingMinutes: 15, recommendedMode: 'transit' },
      },
      'soho': {
        'canary wharf': { walkingMinutes: 85, transitMinutes: 22, drivingMinutes: 18, recommendedMode: 'transit' },
        'mayfair': { walkingMinutes: 10, transitMinutes: 5, drivingMinutes: 8, recommendedMode: 'walk' },
        'covent garden': { walkingMinutes: 8, transitMinutes: 5, drivingMinutes: 8, recommendedMode: 'walk' },
        'shoreditch': { walkingMinutes: 35, transitMinutes: 15, drivingMinutes: 12, recommendedMode: 'transit' },
      },
      'shoreditch': {
        'canary wharf': { walkingMinutes: 50, transitMinutes: 15, drivingMinutes: 12, recommendedMode: 'transit' },
        'mayfair': { walkingMinutes: 45, transitMinutes: 18, drivingMinutes: 15, recommendedMode: 'transit' },
        'soho': { walkingMinutes: 35, transitMinutes: 15, drivingMinutes: 12, recommendedMode: 'transit' },
        'covent garden': { walkingMinutes: 30, transitMinutes: 12, drivingMinutes: 10, recommendedMode: 'transit' },
      }
    };
    
    // Initialize the connections map
    Object.entries(connections).forEach(([from, destinations]) => {
      const fromMap = new Map<string, TravelTimeEstimate>();
      
      Object.entries(destinations).forEach(([to, estimate]) => {
        fromMap.set(to.toLowerCase(), estimate as TravelTimeEstimate);
      });
      
      this.transportConnections.set(from.toLowerCase(), fromMap);
    });
  }
  
  /**
   * Get intelligent travel time estimate between two areas
   */
  public getTravelTime(fromArea: string, toArea: string, preferredMode?: 'walk' | 'transit' | 'driving'): TravelTimeEstimate {
    const fromNormalized = fromArea.toLowerCase();
    const toNormalized = toArea.toLowerCase();
    
    // Check if we have a pre-defined connection
    const fromConnections = this.transportConnections.get(fromNormalized);
    if (fromConnections) {
      const connection = fromConnections.get(toNormalized);
      if (connection) {
        return connection;
      }
    }
    
    // Fallback to distance-based calculation
    const fromAreaData = this.areaDatabase.get(fromNormalized);
    const toAreaData = this.areaDatabase.get(toNormalized);
    
    if (!fromAreaData || !toAreaData) {
      // Default estimate if areas not found
      return {
        walkingMinutes: 30,
        transitMinutes: 20,
        drivingMinutes: 15,
        recommendedMode: 'transit'
      };
    }
    
    // Calculate based on characteristics
    const isNeighbor = fromAreaData.neighbors?.includes(toAreaData.name) || 
                      toAreaData.neighbors?.includes(fromAreaData.name);
    
    if (isNeighbor) {
      return {
        walkingMinutes: 15,
        transitMinutes: 8,
        drivingMinutes: 10,
        recommendedMode: 'walk'
      };
    }
    
    // Default for non-neighbors
    return {
      walkingMinutes: 45,
      transitMinutes: 25,
      drivingMinutes: 20,
      recommendedMode: 'transit'
    };
  }
  
  /**
   * Find areas suitable for specific activity types and preferences
   */
  public findSuitableAreas(
    activityType: string,
    preferences: string[],
    currentLocation: string,
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  ): AreaSuitability[] {
    const results: AreaSuitability[] = [];
    
    this.areaDatabase.forEach((area, areaName) => {
      let score = 0;
      const reasons: string[] = [];
      
      // Check if area is popular for the activity type
      const activityMatch = area.popularFor.some(popular => 
        popular.toLowerCase().includes(activityType.toLowerCase()) ||
        activityType.toLowerCase().includes(popular.toLowerCase())
      );
      
      if (activityMatch) {
        score += 30;
        reasons.push(`Known for ${activityType}`);
      }
      
      // Check preferences match
      preferences.forEach(pref => {
        if (area.characteristics.some(char => char.toLowerCase().includes(pref.toLowerCase()))) {
          score += 20;
          reasons.push(`Matches preference: ${pref}`);
        }
      });
      
      // Consider crowd levels
      const crowdLevel = this.getCrowdLevel(area, timeOfDay);
      if (preferences.includes('quiet') || preferences.includes('non-crowded')) {
        if (crowdLevel <= 2) {
          score += 25;
          reasons.push('Low crowd levels');
        } else if (crowdLevel >= 4) {
          score -= 20;
          reasons.push('High crowd levels');
        }
      }
      
      // Consider travel time
      const travelEstimate = this.getTravelTime(currentLocation, areaName);
      const travelMinutes = travelEstimate.transitMinutes;
      
      if (travelMinutes <= 10) {
        score += 20;
        reasons.push('Very close');
      } else if (travelMinutes <= 20) {
        score += 10;
        reasons.push('Nearby');
      } else if (travelMinutes > 40) {
        score -= 10;
        reasons.push('Far away');
      }
      
      if (score > 0) {
        results.push({
          area,
          score,
          reasons,
          crowdLevel,
          travelTime: travelMinutes
        });
      }
    });
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Get crowd level for an area at a specific time
   */
  private getCrowdLevel(area: LondonArea, timeOfDay: string): number {
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    
    if (isWeekend) {
      return area.crowdLevels.weekend;
    }
    
    switch (timeOfDay) {
      case 'morning':
        return area.crowdLevels.morning;
      case 'afternoon':
        return area.crowdLevels.afternoon;
      case 'evening':
      case 'night':
        return area.crowdLevels.evening;
      default:
        return area.crowdLevels.afternoon;
    }
  }
  
  /**
   * Optimize route through multiple locations
   */
  public optimizeRoute(locations: string[], startLocation: string, endLocation?: string): string[] {
    if (locations.length <= 1) return locations;
    
    // Simple nearest-neighbor optimization
    const optimized: string[] = [];
    const remaining = [...locations];
    let current = startLocation;
    
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let shortestTime = Infinity;
      
      remaining.forEach((location, index) => {
        const travelTime = this.getTravelTime(current, location).transitMinutes;
        if (travelTime < shortestTime) {
          shortestTime = travelTime;
          nearestIndex = index;
        }
      });
      
      const nearest = remaining.splice(nearestIndex, 1)[0];
      optimized.push(nearest);
      current = nearest;
    }
    
    return optimized;
  }
  
  /**
   * Get area characteristics and information
   */
  public getAreaInfo(areaName: string): LondonArea | null {
    return this.areaDatabase.get(areaName.toLowerCase()) || null;
  }
}