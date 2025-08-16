// Shared types for NLP processing

export interface StructuredRequest {
  startLocation: string | null;
  destinations: string[];
  fixedTimes: Array<{
    location: string;
    time: string;  // Format: ISO timestamp or "HH:MM" (24-hour)
    type?: string; // e.g., "restaurant", "cafe"
    // Additional parameters for enhanced search
    searchTerm?: string;
    keywords?: string[];
    minRating?: number;
    displayTime?: string; // Format: "h:mm a" for display in NYC timezone
    searchPreference?: string; // Specific venue preference (e.g., "sandwich place", "sports bar")
  }>;
  preferences: {
    type?: string;
    requirements?: string[];
  };
  // Enhanced response from Gemini with detailed activity information
  activities?: Array<{
    description: string;
    location: string;
    time: string;
    searchParameters: {
      searchTerm: string;
      type: string;
      keywords: string[];
      minRating: number | null;
      requireOpenNow: boolean | null;
    };
    requirements: string[];
    confidence?: number;
  }>;
  isSimplified?: boolean;
}