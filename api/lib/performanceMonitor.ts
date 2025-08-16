// @ts-nocheck
import { performance } from 'perf_hooks';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

interface AggregatedMetrics {
  operation: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  p95Duration: number;
  p99Duration: number;
}

interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private maxMetrics: number;
  private systemMetricsInterval: NodeJS.Timeout | null = null;
  private lastCpuUsage: NodeJS.CpuUsage;

  constructor(maxMetrics = 10000) {
    this.maxMetrics = maxMetrics;
    this.lastCpuUsage = process.cpuUsage();
    this.startSystemMetricsCollection();
  }

  // Start timing an operation
  startTiming(operation: string): PerformanceTimer {
    return new PerformanceTimer(operation, this);
  }

  // Record a completed operation
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the latest metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Log slow operations
    if (metric.duration > 5000) { // 5 seconds
      console.warn(`🐌 [Performance] Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  // Get aggregated metrics for an operation
  getOperationMetrics(operation: string, timeRangeMs?: number): AggregatedMetrics | null {
    const now = Date.now();
    const cutoff = timeRangeMs ? now - timeRangeMs : 0;
    
    const operationMetrics = this.metrics.filter(m => 
      m.operation === operation && m.timestamp >= cutoff
    );
    
    if (operationMetrics.length === 0) {
      return null;
    }
    
    const durations = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = operationMetrics.filter(m => m.success).length;
    
    return {
      operation,
      count: operationMetrics.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      successRate: successCount / operationMetrics.length,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Duration: durations[Math.floor(durations.length * 0.99)] || 0
    };
  }

  // Get all operation metrics
  getAllOperationMetrics(timeRangeMs?: number): AggregatedMetrics[] {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    return operations
      .map(op => this.getOperationMetrics(op, timeRangeMs))
      .filter(metrics => metrics !== null) as AggregatedMetrics[];
  }

  // Get current system metrics
  getCurrentSystemMetrics(): SystemMetrics {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();
    
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: currentCpuUsage,
      timestamp: Date.now()
    };
  }

  // Get system metrics history
  getSystemMetricsHistory(timeRangeMs?: number): SystemMetrics[] {
    const now = Date.now();
    const cutoff = timeRangeMs ? now - timeRangeMs : 0;
    
    return this.systemMetrics.filter(m => m.timestamp >= cutoff);
  }

  // Start collecting system metrics periodically
  private startSystemMetricsCollection(): void {
    this.systemMetricsInterval = setInterval(() => {
      const metrics = this.getCurrentSystemMetrics();
      this.systemMetrics.push(metrics);
      
      // Keep only the latest 1000 system metrics
      if (this.systemMetrics.length > 1000) {
        this.systemMetrics = this.systemMetrics.slice(-1000);
      }
      
      // Log memory warnings
      const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
      if (memoryUsageMB > 500) { // 500MB threshold
        console.warn(`🧠 [Performance] High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
      }
    }, 30000); // Collect every 30 seconds
    
    if (this.systemMetricsInterval.unref) {
      this.systemMetricsInterval.unref();
    }
  }

  // Get performance summary
  getPerformanceSummary(timeRangeMs = 24 * 60 * 60 * 1000): any { // Default: last 24 hours
    const operationMetrics = this.getAllOperationMetrics(timeRangeMs);
    const systemMetrics = this.getSystemMetricsHistory(timeRangeMs);
    
    // Calculate system averages
    const avgMemoryUsage = systemMetrics.length > 0 
      ? systemMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / systemMetrics.length
      : 0;
    
    // Find slowest operations
    const slowestOps = operationMetrics
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5);
    
    // Find operations with lowest success rate
    const unreliableOps = operationMetrics
      .filter(m => m.successRate < 0.95)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 5);
    
    return {
      timeRange: timeRangeMs,
      totalOperations: operationMetrics.reduce((sum, m) => sum + m.count, 0),
      averageMemoryUsage: Math.round(avgMemoryUsage / 1024 / 1024), // MB
      slowestOperations: slowestOps,
      unreliableOperations: unreliableOps,
      operationBreakdown: operationMetrics.map(m => ({
        operation: m.operation,
        count: m.count,
        avgDuration: Math.round(m.averageDuration),
        successRate: Math.round(m.successRate * 100)
      }))
    };
  }

  // Clean up resources
  destroy(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = null;
    }
    this.metrics = [];
    this.systemMetrics = [];
  }
}

// Performance timer class for easy measurement
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private monitor: PerformanceMonitor;
  private metadata: Record<string, any> = {};

  constructor(operation: string, monitor: PerformanceMonitor) {
    this.operation = operation;
    this.monitor = monitor;
    this.startTime = performance.now();
  }

  // Add metadata to the measurement
  addMetadata(key: string, value: any): this {
    this.metadata[key] = value;
    return this;
  }

  // End timing and record the metric
  end(success = true): number {
    const duration = performance.now() - this.startTime;
    
    this.monitor.recordMetric({
      operation: this.operation,
      duration,
      timestamp: Date.now(),
      success,
      metadata: Object.keys(this.metadata).length > 0 ? this.metadata : undefined
    });
    
    return duration;
  }
}

// Decorator for automatic performance monitoring
export function measurePerformance(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operation = operationName || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      const timer = performanceMonitor.startTiming(operation);
      
      try {
        const result = await originalMethod.apply(this, args);
        timer.end(true);
        return result;
      } catch (error) {
        timer.end(false);
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Express middleware for request performance monitoring
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const timer = performanceMonitor.startTiming(`HTTP_${req.method}_${req.route?.path || req.path}`)
      .addMetadata('method', req.method)
      .addMetadata('path', req.path)
      .addMetadata('userAgent', req.get('user-agent'));
    
    // Hook into response end to capture timing
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      timer
        .addMetadata('statusCode', res.statusCode)
        .addMetadata('contentLength', res.get('content-length'))
        .end(res.statusCode < 400);
      
      return originalEnd.apply(this, args);
    };
    
    next();
  };
}