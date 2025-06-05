/**
 * Performance monitoring utilities for the application
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing and record the metric
   */
  endTimer(name: string, tags?: Record<string, string>): number | null {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric(name, duration, tags);
    return duration;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`, tags);
    }

    // Send to analytics if configured
    this.sendToAnalytics(metric);
  }

  /**
   * Measure Web Vitals
   */
  measureWebVitals(): void {
    // First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      this.recordMetric('web-vitals.fcp', fcp.startTime);
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('web-vitals.lcp', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }
    }

    // Time to Interactive
    if (document.readyState === 'complete') {
      const tti = performance.now();
      this.recordMetric('web-vitals.tti', tti);
    } else {
      window.addEventListener('load', () => {
        const tti = performance.now();
        this.recordMetric('web-vitals.tti', tti);
      });
    }
  }

  /**
   * Measure API call performance
   */
  async measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    this.startTimer(name);
    
    try {
      const result = await apiCall();
      this.endTimer(name, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, status: 'error' });
      throw error;
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const summary: Record<string, number[]> = {};

    // Group metrics by name
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = [];
      }
      summary[metric.name].push(metric.value);
    });

    // Calculate statistics
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    Object.entries(summary).forEach(([name, values]) => {
      stats[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });

    return stats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // Only send in production
    if (import.meta.env.PROD) {
      // Implement your analytics integration here
      // Example: Google Analytics, Sentry, custom backend
      
      // For now, just store in sessionStorage for debugging
      const stored = sessionStorage.getItem('performance-metrics');
      const metrics = stored ? JSON.parse(stored) : [];
      metrics.push(metric);
      
      // Keep only last 100 metrics
      if (metrics.length > 100) {
        metrics.shift();
      }
      
      sessionStorage.setItem('performance-metrics', JSON.stringify(metrics));
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Measure initial page load
if (typeof window !== 'undefined') {
  performanceMonitor.measureWebVitals();
}

/**
 * React hook for measuring component render performance
 */
export function usePerformance(componentName: string) {
  const renderCount = React.useRef(0);
  const mountTime = React.useRef(0);

  React.useEffect(() => {
    // Measure mount time
    mountTime.current = performance.now();
    performanceMonitor.recordMetric(`component.${componentName}.mount`, mountTime.current);

    return () => {
      // Measure unmount
      const lifetime = performance.now() - mountTime.current;
      performanceMonitor.recordMetric(`component.${componentName}.lifetime`, lifetime);
    };
  }, [componentName]);

  React.useEffect(() => {
    // Count renders
    renderCount.current++;
    performanceMonitor.recordMetric(`component.${componentName}.render`, renderCount.current, {
      count: renderCount.current.toString()
    });
  });

  return {
    measureAction: (actionName: string, action: () => void) => {
      performanceMonitor.startTimer(`${componentName}.${actionName}`);
      action();
      performanceMonitor.endTimer(`${componentName}.${actionName}`);
    },
    measureAsyncAction: async <T,>(actionName: string, action: () => Promise<T>) => {
      return performanceMonitor.measureApiCall(`${componentName}.${actionName}`, action);
    }
  };
}