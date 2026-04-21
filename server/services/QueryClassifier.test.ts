import { describe, expect, it } from 'vitest';
import { QueryClassifier } from './QueryClassifier.js';

describe('QueryClassifier', () => {
  const classifier = new QueryClassifier();

  it('classifies comma-separated two-stop meal queries as complex', () => {
    const result = classifier.classify('lunch in Mayfair, dinner in Holborn');

    expect(result.tier).toBe('complex');
    expect(result.activityCount).toBeGreaterThanOrEqual(2);
    expect(result.model).toBe('gemini-2.5-flash');
  });

  it('classifies sequential mixed-stop queries as complex', () => {
    const result = classifier.classify('coffee in Shoreditch then lunch in Soho');

    expect(result.tier).toBe('complex');
    expect(result.activityCount).toBeGreaterThanOrEqual(2);
  });

  it('classifies activity-led queries without explicit separators as complex', () => {
    const result = classifier.classify('Lunch near the capitol building Dinner downtown');

    expect(result.tier).toBe('complex');
    expect(result.activityCount).toBeGreaterThanOrEqual(2);
  });

  it('keeps single-stop detailed queries out of the complex tier', () => {
    const result = classifier.classify('quiet cafe with good coffee in Mayfair');

    expect(result.tier).not.toBe('complex');
    expect(result.activityCount).toBe(1);
  });
});
