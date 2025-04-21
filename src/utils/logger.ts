type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, details?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };

    this.logs.push(entry);
    console.log(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`);
    if (details) {
      console.log('Details:', details);
    }
  }

  info(message: string, details?: unknown) {
    this.log('info', message, details);
  }

  warn(message: string, details?: unknown) {
    this.log('warn', message, details);
  }

  error(message: string, details?: unknown) {
    this.log('error', message, details);
  }

  debug(message: string, details?: unknown) {
    this.log('debug', message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();

 