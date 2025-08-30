import { kv } from '@vercel/kv'
import { logSecurityWarning } from './logging'

// Validate KV environment variables
function validateKVConfig() {
  // Check for Vercel KV environment variables first, then fallback to Upstash
  const vercelKVVars = [
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN'
  ]
  
  const upstashVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ]

  // Check if Vercel KV variables are present
  const missingVercelKV = vercelKVVars.filter(envVar => !process.env[envVar])
  const missingUpstash = upstashVars.filter(envVar => !process.env[envVar])

  // If both sets are missing, throw an error
  if (missingVercelKV.length > 0 && missingUpstash.length > 0) {
    const errorMessage = `KV Store configuration is incomplete. Missing environment variables: ${[...missingVercelKV, ...missingUpstash].join(', ')}. Please configure either Vercel KV or Upstash Redis.`
    logSecurityWarning(errorMessage)
    throw new Error(errorMessage)
  }

  // Verify URL is using HTTPS for encryption in transit
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  if (kvUrl && !kvUrl.startsWith('https://')) {
    const urlWarning = 'KV Store URL is not using HTTPS. This presents a security risk in production.'
    // Redact credentials using URL API to avoid regex backtracking vulnerabilities
    let safeUrl = kvUrl;
    try {
      const parsedUrl = new URL(kvUrl);
      // Remove credentials entirely
      parsedUrl.username = '';
      parsedUrl.password = '';
      safeUrl = parsedUrl.toString();
    } catch {
      const atIndex = kvUrl.indexOf('@');
      if (atIndex !== -1) {
        // Strip credentials and '@'
        safeUrl = kvUrl.slice(atIndex + 1);
      }
    }
    logSecurityWarning(urlWarning, { url: safeUrl })
    
    // In production, consider throwing an error here
    if (process.env.NODE_ENV === 'production') {
      throw new Error('KV Store connection must use HTTPS in production')
    }
  }
  
  return true
}

// Initialize KV Store with validation
let kvClient: typeof kv | null = null

try {
  // Validate before creating the client
  validateKVConfig()
  
  // Initialize KV client (Vercel KV automatically uses the correct environment variables)
  kvClient = kv
} catch (error) {
  console.error('Failed to initialize KV Store client:', error)
  // Don't throw here - allow the app to start with a warning
}

export const redis = kvClient
