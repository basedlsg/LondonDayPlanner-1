// @ts-nocheck
import { format } from 'date-fns';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

class Logger {
  private logEntries: LogEntry[] = [];
  private maxEntries = 1000; // Keep last 1000 log entries

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}`;
  }

  info(message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      data
    };
    
    this.addEntry(entry);
    console.log(this.formatMessage('info', message, context), data ? JSON.stringify(data, null, 2) : '');
  }

  warn(message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      data
    };
    
    this.addEntry(entry);
    console.warn(this.formatMessage('warn', message, context), data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, error?: Error | any, context?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: error instanceof Error ? error : undefined,
      data: error && !(error instanceof Error) ? error : undefined
    };
    
    this.addEntry(entry);
    console.error(
      this.formatMessage('error', message, context),
      error?.stack || error?.message || JSON.stringify(error, null, 2) || ''
    );
  }

  debug(message: string, data?: any, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        context,
        data
      };
      
      this.addEntry(entry);
      console.debug(this.formatMessage('debug', message, context), data ? JSON.stringify(data, null, 2) : '');
    }
  }

  private addEntry(entry: LogEntry) {
    this.logEntries.push(entry);
    if (this.logEntries.length > this.maxEntries) {
      this.logEntries.shift(); // Remove oldest entry
    }
  }

  getRecentLogs(count = 100): LogEntry[] {
    return this.logEntries.slice(-count);
  }

  getLogsByLevel(level: string, count = 100): LogEntry[] {
    return this.logEntries
      .filter(entry => entry.level === level)
      .slice(-count);
  }

  clearLogs() {
    this.logEntries = [];
  }

  // Performance logging helpers
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`Timer: ${label} completed in ${duration}ms`, { duration }, 'PERFORMANCE');
    };
  }

  // API request logging
  logApiRequest(method: string, url: string, statusCode?: number, duration?: number, error?: Error) {
    const level = error ? 'error' : statusCode && statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${url} ${statusCode || 'pending'}${duration ? ` (${duration}ms)` : ''}`;
    
    if (level === 'error') {
      this.error(message, error, 'API');
    } else if (level === 'warn') {
      this.warn(message, { statusCode, duration }, 'API');
    } else {
      this.info(message, { statusCode, duration }, 'API');
    }
  }

  // Database operation logging
  logDbOperation(operation: string, table?: string, duration?: number, error?: Error) {
    const context = table ? `DB:${table}` : 'DB';
    const message = `${operation}${duration ? ` (${duration}ms)` : ''}`;
    
    if (error) {
      this.error(message, error, context);
    } else {
      this.debug(message, { duration }, context);
    }
  }

  // External API logging
  logExternalApi(service: string, operation: string, duration?: number, error?: Error) {
    const context = `EXT:${service}`;
    const message = `${operation}${duration ? ` (${duration}ms)` : ''}`;
    
    if (error) {
      this.error(message, error, context);
    } else {
      this.info(message, { duration }, context);
    }
  }
}

export const logger = new Logger();

// Express middleware for request logging
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(body: any) {
    const duration = Date.now() - start;
    logger.logApiRequest(req.method, req.url, res.statusCode, duration);
    return originalSend.call(this, body);
  };
  
  next();
}