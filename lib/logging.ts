/**
 * Logging utilities for the application
 */

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Generic logger function with levels
export function log(level: LogLevel, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    level,
    message,
    ...data
  }
  
  // Output based on log level
  switch (level) {
    case LogLevel.ERROR:
      console.error(JSON.stringify(entry))
      break
    case LogLevel.WARN:
      console.warn(JSON.stringify(entry))
      break
    case LogLevel.INFO:
      console.log(JSON.stringify(entry))
      break
    case LogLevel.DEBUG:
      console.debug(JSON.stringify(entry))
      break
  }
}

// Log API requests with standardized format
export function logApiRequest(type: string, ip: string, status: number, error?: string) {
  log(LogLevel.INFO, `API Request: ${type}`, {
    type,
    ip,
    status,
    error: error || null,
  })
}

// Security warning logger
export function logSecurityWarning(message: string, data?: any) {
  log(LogLevel.WARN, `SECURITY WARNING: ${message}`, data)
}

// Configuration logger
export function logConfiguration(name: string, config: any) {
  // Clone and sanitize the config before logging
  const sanitizedConfig = JSON.parse(JSON.stringify(config))
  
  // Remove any sensitive fields
  const sensitiveKeys = ['key', 'token', 'password', 'secret', 'credential']
  
  function sanitizeObject(obj: any) {
    if (!obj || typeof obj !== 'object') return
    
    Object.keys(obj).forEach(key => {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        obj[key] = '[REDACTED]'
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key])
      }
    })
  }
  
  sanitizeObject(sanitizedConfig)
  
  log(LogLevel.INFO, `Configuration loaded: ${name}`, { config: sanitizedConfig })
}
