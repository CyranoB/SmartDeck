import { Redis } from '@upstash/redis'
import { logSecurityWarning } from './logging'

// Validate Redis environment variables
function validateRedisConfig() {
  // Check essential environment variables for Redis
  const requiredEnvVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ]

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])

  if (missing.length > 0) {
    const errorMessage = `Redis configuration is incomplete. Missing environment variables: ${missing.join(', ')}`
    logSecurityWarning(errorMessage)
    throw new Error(errorMessage)
  }

  // Verify URL is using HTTPS for encryption in transit
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  if (redisUrl && !redisUrl.startsWith('https://')) {
    const urlWarning = 'Redis URL is not using HTTPS. This presents a security risk in production.'
    logSecurityWarning(urlWarning, { url: redisUrl.replace(/:[^\/]+@/, ':***@') }) // Redact any credentials in the URL
    
    // In production, consider throwing an error here
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Redis connection must use HTTPS in production')
    }
  }
  
  return true
}

// Initialize Redis with validation
let redisClient: Redis | null = null

try {
  // Validate before creating the client
  validateRedisConfig()
  
  // Initialize Redis client
  redisClient = Redis.fromEnv()
} catch (error) {
  console.error('Failed to initialize Redis client:', error)
  // Don't throw here - allow the app to start with a warning
}

export const redis = redisClient as Redis
