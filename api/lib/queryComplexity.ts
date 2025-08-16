// @ts-nocheck
/**
 * Query Complexity Detection Service
 * 
 * Analyzes user queries to determine complexity level and processing requirements.
 * This helps optimize system response and user experience.
 */

export interface ComplexityAnalysis {
  level: 'simple' | 'moderate' | 'complex' | 'very_complex';
  score: number; // 0-100 complexity score
  factors: string[]; // What makes this query complex
  recommendations: {
    processingTime: 'fast' | 'normal' | 'slow';
    useAdvancedNLP: boolean;
    suggestSimplification: boolean;
    estimatedResponseTime: number; // seconds
  };
  breakdown: {
    timeReferences: number;
    locationReferences: number;
    activityCount: number;
    constraints: number;
    sequencing: boolean;
    multiDay: boolean;
    groupSize: number;
    specialRequirements: number;
  };
}

/**
 * Analyzes query complexity and returns detailed analysis
 */
export function analyzeQueryComplexity(query: string): ComplexityAnalysis {
  const factors: string[] = [];
  let score = 0;
  
  // Normalize query for analysis
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);
  const sentences = query.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Initialize breakdown
  const breakdown = {
    timeReferences: 0,
    locationReferences: 0,
    activityCount: 0,
    constraints: 0,
    sequencing: false,
    multiDay: false,
    groupSize: 1,
    specialRequirements: 0
  };
  
  // 1. TIME COMPLEXITY ANALYSIS
  const timePatterns = [
    /\b(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))\b/gi, // Specific times
    /\b(morning|afternoon|evening|night|noon|midnight)\b/gi, // Time periods
    /\b(before|after|then|next|followed by|later)\b/gi, // Sequence words
    /\b(in \d+ hours?|hours? later|\d+ hours? from)\b/gi, // Relative time
    /\b(early|late|around|about|roughly)\b/gi // Time modifiers
  ];
  
  timePatterns.forEach(pattern => {
    const matches = normalizedQuery.match(pattern) || [];
    breakdown.timeReferences += matches.length;
  });
  
  if (breakdown.timeReferences > 3) {
    score += 15;
    factors.push('Multiple time references');
  } else if (breakdown.timeReferences > 1) {
    score += 8;
    factors.push('Some time complexity');
  }
  
  // 2. LOCATION COMPLEXITY ANALYSIS
  const locationPatterns = [
    /\b(in|at|near|around|by|close to|next to)\s+[A-Z][a-z]+/g, // Location prepositions
    /\b(soho|midtown|downtown|times square|central park|brooklyn|manhattan|queens|bronx)\b/gi, // Common areas
    /\b(street|st|avenue|ave|road|rd|boulevard|blvd)\b/gi, // Street references
    /\b(then go to|move to|head to|walk to|next stop)\b/gi // Movement between locations
  ];
  
  locationPatterns.forEach(pattern => {
    const matches = normalizedQuery.match(pattern) || [];
    breakdown.locationReferences += matches.length;
  });
  
  if (breakdown.locationReferences > 4) {
    score += 20;
    factors.push('Multiple locations with routing');
  } else if (breakdown.locationReferences > 2) {
    score += 10;
    factors.push('Several locations mentioned');
  }
  
  // 3. ACTIVITY COUNT ANALYSIS
  const activityWords = [
    'coffee', 'lunch', 'dinner', 'breakfast', 'brunch', 'drinks', 'cocktails',
    'museum', 'gallery', 'show', 'theater', 'concert', 'shopping', 'walk',
    'visit', 'see', 'explore', 'tour', 'meeting', 'appointment', 'work'
  ];
  
  activityWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = normalizedQuery.match(regex) || [];
    breakdown.activityCount += matches.length;
  });
  
  // Also count sentence-based activities
  if (sentences.length > 1) {
    breakdown.activityCount += sentences.length - 1;
  }
  
  if (breakdown.activityCount > 5) {
    score += 25;
    factors.push('Many activities planned');
  } else if (breakdown.activityCount > 3) {
    score += 15;
    factors.push('Multiple activities');
  } else if (breakdown.activityCount > 1) {
    score += 8;
    factors.push('Several activities');
  }
  
  // 4. SEQUENCING COMPLEXITY
  const sequenceWords = ['then', 'after', 'before', 'followed by', 'next', 'afterwards', 'first', 'second', 'finally'];
  const hasSequencing = sequenceWords.some(word => normalizedQuery.includes(word));
  breakdown.sequencing = hasSequencing;
  
  if (hasSequencing) {
    score += 12;
    factors.push('Sequential planning required');
  }
  
  // 5. CONSTRAINTS AND REQUIREMENTS
  const constraintPatterns = [
    /\b(budget|cheap|expensive|under \$\d+)\b/gi, // Budget constraints
    /\b(vegetarian|vegan|kosher|halal|gluten.free)\b/gi, // Dietary restrictions
    /\b(quiet|loud|busy|crowded|peaceful)\b/gi, // Ambiance preferences
    /\b(outdoor|indoor|covered|air.conditioned)\b/gi, // Environment preferences
    /\b(kid.friendly|family|wheelchair|accessible)\b/gi, // Accessibility
    /\b(parking|metro|subway|walking distance)\b/gi, // Transportation
    /\b(wifi|laptop|work.friendly|power outlets)\b/gi // Work requirements
  ];
  
  constraintPatterns.forEach(pattern => {
    const matches = normalizedQuery.match(pattern) || [];
    breakdown.constraints += matches.length;
  });
  
  if (breakdown.constraints > 3) {
    score += 15;
    factors.push('Many specific requirements');
  } else if (breakdown.constraints > 1) {
    score += 8;
    factors.push('Some specific requirements');
  }
  
  // 6. MULTI-DAY DETECTION
  const multiDayPatterns = [
    /\b(\d+.day|multi.day|weekend|week)\b/gi,
    /\b(tomorrow|yesterday|next day|following day)\b/gi,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi
  ];
  
  const isMultiDay = multiDayPatterns.some(pattern => normalizedQuery.match(pattern));
  breakdown.multiDay = isMultiDay;
  
  if (isMultiDay) {
    score += 20;
    factors.push('Multi-day planning');
  }
  
  // 7. GROUP SIZE ANALYSIS
  const groupPatterns = [
    /\b(group of (\d+)|(\d+) people|family|couple)\b/gi,
    /\b(we|us|our group|my family|my friends)\b/gi
  ];
  
  let groupSize = 1;
  groupPatterns.forEach(pattern => {
    const match = normalizedQuery.match(pattern);
    if (match) {
      if (match[0].includes('family')) groupSize = Math.max(groupSize, 4);
      else if (match[0].includes('group') || match[0].includes('we')) groupSize = Math.max(groupSize, 3);
      else if (match[0].includes('couple')) groupSize = Math.max(groupSize, 2);
    }
  });
  breakdown.groupSize = groupSize;
  
  if (groupSize > 4) {
    score += 10;
    factors.push('Large group planning');
  } else if (groupSize > 2) {
    score += 5;
    factors.push('Group planning');
  }
  
  // 8. SPECIAL REQUIREMENTS
  const specialPatterns = [
    /\b(celebration|birthday|anniversary|date night)\b/gi,
    /\b(business|client|important|formal)\b/gi,
    /\b(romantic|intimate|special occasion)\b/gi,
    /\b(emergency|urgent|last.minute)\b/gi
  ];
  
  specialPatterns.forEach(pattern => {
    const matches = normalizedQuery.match(pattern) || [];
    breakdown.specialRequirements += matches.length;
  });
  
  if (breakdown.specialRequirements > 0) {
    score += 8;
    factors.push('Special occasion planning');
  }
  
  // 9. QUERY LENGTH ANALYSIS
  if (words.length > 25) {
    score += 10;
    factors.push('Very detailed query');
  } else if (words.length > 15) {
    score += 5;
    factors.push('Detailed query');
  }
  
  // 10. DETERMINE COMPLEXITY LEVEL
  let level: ComplexityAnalysis['level'];
  if (score >= 70) {
    level = 'very_complex';
  } else if (score >= 45) {
    level = 'complex';
  } else if (score >= 25) {
    level = 'moderate';
  } else {
    level = 'simple';
  }
  
  // Generate recommendations
  const recommendations = generateRecommendations(level, score, breakdown);
  
  return {
    level,
    score: Math.min(score, 100),
    factors,
    recommendations,
    breakdown
  };
}

/**
 * Generates processing recommendations based on complexity analysis
 */
function generateRecommendations(
  level: ComplexityAnalysis['level'],
  score: number,
  breakdown: ComplexityAnalysis['breakdown']
): ComplexityAnalysis['recommendations'] {
  switch (level) {
    case 'simple':
      return {
        processingTime: 'fast',
        useAdvancedNLP: false,
        suggestSimplification: false,
        estimatedResponseTime: 2
      };
      
    case 'moderate':
      return {
        processingTime: 'normal',
        useAdvancedNLP: true,
        suggestSimplification: false,
        estimatedResponseTime: 4
      };
      
    case 'complex':
      return {
        processingTime: 'normal',
        useAdvancedNLP: true,
        suggestSimplification: score > 60,
        estimatedResponseTime: 6
      };
      
    case 'very_complex':
      return {
        processingTime: 'slow',
        useAdvancedNLP: true,
        suggestSimplification: true,
        estimatedResponseTime: 10
      };
      
    default:
      return {
        processingTime: 'normal',
        useAdvancedNLP: true,
        suggestSimplification: false,
        estimatedResponseTime: 4
      };
  }
}

/**
 * Generates user-friendly suggestions for simplifying complex queries
 */
export function generateSimplificationSuggestions(analysis: ComplexityAnalysis): string[] {
  const suggestions: string[] = [];
  
  if (analysis.breakdown.activityCount > 5) {
    suggestions.push("Consider breaking this into multiple separate requests for better results");
  }
  
  if (analysis.breakdown.locationReferences > 4) {
    suggestions.push("Try focusing on one neighborhood or area at a time");
  }
  
  if (analysis.breakdown.timeReferences > 4) {
    suggestions.push("Consider specifying just the start time and let us suggest the schedule");
  }
  
  if (analysis.breakdown.constraints > 3) {
    suggestions.push("Prioritize your most important requirements for better venue matching");
  }
  
  if (analysis.breakdown.multiDay) {
    suggestions.push("Plan one day at a time for more detailed and accurate suggestions");
  }
  
  return suggestions;
}

/**
 * Quick complexity check for route handlers
 */
export function isHighComplexityQuery(query: string): boolean {
  const analysis = analyzeQueryComplexity(query);
  return analysis.level === 'complex' || analysis.level === 'very_complex';
}

/**
 * Get estimated processing time for a query
 */
export function getEstimatedProcessingTime(query: string): number {
  const analysis = analyzeQueryComplexity(query);
  return analysis.recommendations.estimatedResponseTime;
}