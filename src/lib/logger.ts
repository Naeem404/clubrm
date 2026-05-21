// Centralized logging service for the application
// Replaces console.error/console.log throughout the codebase

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  level: LogLevel
  message: string
  context?: string
  data?: unknown
  timestamp: string
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 100 // Keep last 100 logs in memory

  private log(level: LogLevel, message: string, context?: string, data?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString()
    }

    // Store in memory
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Console output for development
    const consoleMethod = level === LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log'
    const prefix = context ? `[${context}]` : ''
    console[consoleMethod](`${prefix} ${message}`, data || '')
  }

  debug(message: string, context?: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, context, data)
  }

  info(message: string, context?: string, data?: unknown) {
    this.log(LogLevel.INFO, message, context, data)
  }

  warn(message: string, context?: string, data?: unknown) {
    this.log(LogLevel.WARN, message, context, data)
  }

  error(message: string, context?: string, data?: unknown) {
    this.log(LogLevel.ERROR, message, context, data)
  }

  // Get recent logs for debugging
  getLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count)
  }

  // Clear logs
  clearLogs() {
    this.logs = []
  }
}

// Export singleton instance
export const logger = new Logger()

// Convenience functions for direct imports
export const logError = (message: string, context?: string, data?: unknown) => {
  logger.error(message, context, data)
}

export const logWarn = (message: string, context?: string, data?: unknown) => {
  logger.warn(message, context, data)
}

export const logInfo = (message: string, context?: string, data?: unknown) => {
  logger.info(message, context, data)
}

export const logDebug = (message: string, context?: string, data?: unknown) => {
  logger.debug(message, context, data)
}
