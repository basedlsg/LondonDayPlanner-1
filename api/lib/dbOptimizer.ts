// @ts-nocheck
import { performance } from 'perf_hooks';
import { performanceMonitor } from './performanceMonitor';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  rows?: number;
  error?: string;
}

interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
}

export class DatabaseOptimizer {
  private queryMetrics: QueryMetrics[] = [];
  private maxMetrics = 1000;
  private slowQueryThreshold = 100; // milliseconds

  constructor() {
    // Start periodic analysis
    setInterval(() => this.analyzeQueries(), 60000); // Every minute
  }

  // Wrap database query execution with monitoring
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    expectedRows?: number
  ): Promise<T> {
    const timer = performanceMonitor.startTiming(`db_query_${queryName}`)
      .addMetadata('queryName', queryName);
    
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      // Record metrics
      this.recordQuery({
        query: queryName,
        duration,
        timestamp: Date.now(),
        rows: Array.isArray(result) ? result.length : 1
      });
      
      timer
        .addMetadata('duration', duration)
        .addMetadata('rows', Array.isArray(result) ? result.length : 1)
        .end(true);
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`🐌 [DB] Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordQuery({
        query: queryName,
        duration,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      timer
        .addMetadata('duration', duration)
        .addMetadata('error', error instanceof Error ? error.message : 'Unknown error')
        .end(false);
      
      throw error;
    }
  }

  // Record query metrics
  private recordQuery(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only latest metrics
    if (this.queryMetrics.length > this.maxMetrics) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetrics);
    }
  }

  // Analyze queries for optimization opportunities
  private analyzeQueries(): void {
    if (this.queryMetrics.length === 0) return;
    
    const last10Minutes = Date.now() - (10 * 60 * 1000);
    const recentQueries = this.queryMetrics.filter(q => q.timestamp >= last10Minutes);
    
    if (recentQueries.length === 0) return;
    
    // Group by query name
    const queryGroups = recentQueries.reduce((acc, query) => {
      if (!acc[query.query]) {
        acc[query.query] = [];
      }
      acc[query.query].push(query);
      return acc;
    }, {} as Record<string, QueryMetrics[]>);
    
    // Find optimization opportunities
    const insights: string[] = [];
    
    for (const [queryName, queries] of Object.entries(queryGroups)) {
      const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / queries.length;
      const errorRate = queries.filter(q => q.error).length / queries.length;
      const frequency = queries.length;
      
      // High frequency, slow queries
      if (frequency > 10 && avgDuration > this.slowQueryThreshold) {
        insights.push(`High-frequency slow query: ${queryName} (${frequency} calls, avg ${avgDuration.toFixed(2)}ms)`);
      }
      
      // High error rate
      if (errorRate > 0.1) {
        insights.push(`High error rate: ${queryName} (${(errorRate * 100).toFixed(1)}% failures)`);
      }
      
      // Very slow individual queries
      const slowQueries = queries.filter(q => q.duration > this.slowQueryThreshold * 5);
      if (slowQueries.length > 0) {
        insights.push(`Very slow queries detected for: ${queryName} (${slowQueries.length} queries > ${this.slowQueryThreshold * 5}ms)`);
      }
    }
    
    if (insights.length > 0) {
      console.log('🔍 [DB Optimizer] Performance insights:');
      insights.forEach(insight => console.log(`   • ${insight}`));
    }
  }

  // Get query performance summary
  getQueryPerformance(timeRangeMs = 60 * 60 * 1000): any {
    const cutoff = Date.now() - timeRangeMs;
    const recentQueries = this.queryMetrics.filter(q => q.timestamp >= cutoff);
    
    if (recentQueries.length === 0) {
      return { message: 'No queries in time range' };
    }
    
    // Group by query
    const queryStats = recentQueries.reduce((acc, query) => {
      if (!acc[query.query]) {
        acc[query.query] = {
          count: 0,
          totalDuration: 0,
          errors: 0,
          minDuration: Infinity,
          maxDuration: 0,
          totalRows: 0
        };
      }
      
      const stats = acc[query.query];
      stats.count++;
      stats.totalDuration += query.duration;
      stats.minDuration = Math.min(stats.minDuration, query.duration);
      stats.maxDuration = Math.max(stats.maxDuration, query.duration);
      
      if (query.error) {
        stats.errors++;
      }
      
      if (query.rows) {
        stats.totalRows += query.rows;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate averages and sort by performance impact
    const performanceReport = Object.entries(queryStats)
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
        maxDuration: stats.maxDuration,
        errorRate: stats.errors / stats.count,
        avgRows: stats.totalRows / stats.count,
        totalImpact: stats.totalDuration // Total time spent on this query
      }))
      .sort((a, b) => b.totalImpact - a.totalImpact);
    
    return {
      timeRange: timeRangeMs,
      totalQueries: recentQueries.length,
      uniqueQueries: Object.keys(queryStats).length,
      queries: performanceReport
    };
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const recent = this.getQueryPerformance(30 * 60 * 1000); // Last 30 minutes
    
    if (!recent.queries) return recommendations;
    
    for (const query of recent.queries) {
      // Recommend indexing for slow, frequent queries
      if (query.count > 10 && query.avgDuration > 50) {
        recommendations.push(
          `Consider adding indexes for "${query.query}" - called ${query.count} times with avg duration ${query.avgDuration.toFixed(2)}ms`
        );
      }
      
      // Recommend query optimization for high-impact queries
      if (query.totalImpact > 1000) {
        recommendations.push(
          `Optimize "${query.query}" - high total impact (${query.totalImpact.toFixed(2)}ms total time)`
        );
      }
      
      // Recommend error handling for unreliable queries
      if (query.errorRate > 0.05) {
        recommendations.push(
          `Improve error handling for "${query.query}" - ${(query.errorRate * 100).toFixed(1)}% error rate`
        );
      }
      
      // Recommend pagination for large result sets
      if (query.avgRows > 100) {
        recommendations.push(
          `Consider pagination for "${query.query}" - returning avg ${query.avgRows.toFixed(0)} rows`
        );
      }
    }
    
    return recommendations;
  }

  // Clear metrics (for testing or memory management)
  clearMetrics(): void {
    this.queryMetrics = [];
    console.log('🗑️ [DB Optimizer] Query metrics cleared');
  }
}

// Query builder helpers for common optimizations
export class QueryOptimizations {
  // Generate efficient WHERE clauses with proper indexing hints
  static buildWhereClause(conditions: Record<string, any>): string {
    const clauses = Object.entries(conditions)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key} IN (${value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')})`;
        }
        if (typeof value === 'string') {
          return `${key} = '${value}'`;
        }
        return `${key} = ${value}`;
      });
    
    return clauses.length > 0 ? clauses.join(' AND ') : '1=1';
  }

  // Generate optimized ORDER BY clauses
  static buildOrderBy(sortFields: Array<{ field: string; direction: 'ASC' | 'DESC' }>): string {
    if (sortFields.length === 0) return '';
    
    const orderClauses = sortFields.map(({ field, direction }) => `${field} ${direction}`);
    return `ORDER BY ${orderClauses.join(', ')}`;
  }

  // Generate LIMIT clauses with offset for pagination
  static buildPagination(page: number, pageSize: number): string {
    const offset = (page - 1) * pageSize;
    return `LIMIT ${pageSize} OFFSET ${offset}`;
  }
}

// Connection pool implementation (simplified)
export class ConnectionPool {
  private connections: any[] = [];
  private config: ConnectionPoolConfig;
  private activeConnections = 0;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 30000,
      ...config
    };
  }

  async getConnection(): Promise<any> {
    // Simplified connection pool logic
    // In a real implementation, this would manage actual database connections
    return new Promise((resolve, reject) => {
      if (this.activeConnections < this.config.maxConnections) {
        this.activeConnections++;
        resolve({ id: Date.now(), acquired: new Date() });
      } else {
        setTimeout(() => {
          if (this.activeConnections < this.config.maxConnections) {
            this.activeConnections++;
            resolve({ id: Date.now(), acquired: new Date() });
          } else {
            reject(new Error('Connection pool exhausted'));
          }
        }, 100);
      }
    });
  }

  releaseConnection(connection: any): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  getStatus() {
    return {
      activeConnections: this.activeConnections,
      maxConnections: this.config.maxConnections,
      utilizationRate: this.activeConnections / this.config.maxConnections
    };
  }
}

// Singleton instance
export const dbOptimizer = new DatabaseOptimizer();