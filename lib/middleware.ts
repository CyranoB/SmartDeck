import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { config } from "@/lib/config"
import { rateLimit } from "@/lib/rate-limit"
import { getRateLimitConfig } from "@/lib/env"
import { RateLimitError, ValidationError } from '@/lib/errors'

// Rate limiting types
export interface RateLimitResult {
  success: boolean;
  status?: number;
  headers?: {
    'Retry-After': string;
    'X-RateLimit-Limit': string;
    'X-RateLimit-Reset': string;
  };
  error?: string;
  retryAfter?: number; // Add retryAfter property for client-side handling
}

// Rate limiting configuration
const RATE_LIMIT = {
  // Number of requests allowed per IP per interval
  REQUESTS_PER_MINUTE: config.rateLimitRequestsPerMinute,
  
  // Time window for rate limiting in milliseconds
  INTERVAL_MS: config.rateLimitIntervalMs,
  
  // Maximum number of different IP addresses that can be tracked simultaneously
  MAX_TRACKED_IPS: config.rateLimitMaxTrackedIps
}

// Initialize rate limiter with configurable values
const limiter = rateLimit({
  interval: RATE_LIMIT.INTERVAL_MS,
  maxTrackedIPs: RATE_LIMIT.MAX_TRACKED_IPS
})

/**
 * Extract client IP from request headers with secure validation
 * Checks x-forwarded-for and x-real-ip headers with anti-spoofing protection
 */
export function getClientIP(headersList: Headers): string {
  // List of trusted proxies (should be configured in environment)
  // In production, this should be your load balancers and proxies
  const trustedProxies = (process.env.TRUSTED_PROXIES || '127.0.0.1,::1')
    .split(',')
    .map(ip => ip.trim());
  
  // Get the connecting IP (directly connected client)
  const connectionIP = headersList.get("x-connecting-ip") || "127.0.0.1";
  
  // Only accept x-forwarded-for from trusted sources
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIP = headersList.get("x-real-ip");
  
  // Determine if the connecting IP is a trusted proxy
  const isFromTrustedProxy = trustedProxies.includes(connectionIP);
  
  if (isFromTrustedProxy && forwardedFor) {
    // x-forwarded-for may contain multiple IPs, take the first one (original client)
    return forwardedFor.split(',')[0].trim();
  } else if (isFromTrustedProxy && realIP) {
    // Only accept x-real-ip from trusted proxies
    return realIP.trim();
  }
  
  // If not from a trusted proxy, use the actual connecting IP
  // This prevents header spoofing from untrusted sources
  return connectionIP;
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  // Remove any surrounding brackets from IPv6 addresses
  ip = ip.replace(/^\[|\]$/g, '');

  // IPv4 validation
  if (ip.includes('.')) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      return false;
    }
    
    // Validate each octet is between 0 and 255
    const octets = ip.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // IPv6 validation
  if (ip.includes(':')) {
    // Check for compressed notation (::)
    const hasCompressedZeros = ip.includes('::');
    if (hasCompressedZeros && (ip.match(/::/g) || []).length > 1) {
      return false; // Only one '::' allowed
    }
    
    // Split into segments
    const segments = ip.split(':');
    
    // Count actual segments (accounting for ::)
    const actualSegments = hasCompressedZeros 
      ? segments.filter(s => s !== '').length
      : segments.length;
    
    // Check if we have the right number of segments
    if (!hasCompressedZeros && actualSegments !== 8) {
      return false;
    }
    if (hasCompressedZeros && actualSegments > 7) {
      return false;
    }
    
    // Validate each segment
    return segments.every(segment => {
      if (segment === '') return true; // Allow empty segments for ::
      return /^[0-9A-Fa-f]{1,4}$/.test(segment);
    });
  }
  
  return false; // Neither IPv4 nor IPv6
}

/**
 * Validates the request body size
 * @param req Next.js request object
 * @returns Validation result
 */
export interface ValidationResult {
  success: boolean;
  error?: string;
}

export async function validateRequestBody(req: NextRequest): Promise<ValidationResult> {
  try {
    // Clone the request to avoid consuming the body
    const clonedReq = req.clone()
    
    // Get the content length from headers
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
    
    // Check if content length exceeds the limit (configurable from environment)
    if (contentLength > config.maxFileSizeBytes) {
      return {
        success: false,
        error: `Request body too large. Maximum size is ${config.maxFileSizeMB}MB.`
      }
    }
    
    // If content length is not available or zero, try to get the actual body size
    if (contentLength === 0) {
      const body = await clonedReq.text()
      if (body.length > config.maxFileSizeBytes) {
        return {
          success: false,
          error: `Request body too large. Maximum size is ${config.maxFileSizeMB}MB.`
        }
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error validating request body:", error)
    return {
      success: false,
      error: "Error validating request body"
    }
  }
}

// Validate request body for AI operations
export function validateAIRequestBody(body: any) {
  if (!body) {
    throw new ValidationError("Missing request body")
  }
  
  if (!body.type || !["analyze", "generate-batch", "generate-mcq-batch"].includes(body.type)) {
    throw new ValidationError("Invalid operation type")
  }

  if (body.type === "analyze" && !body.transcript) {
    throw new ValidationError("Missing transcript for analysis")
  }

  if (body.type === "generate-batch") {
    if (!body.courseData) throw new ValidationError("Missing course data")
    if (!body.transcript) throw new ValidationError("Missing transcript")
    if (body.count && (isNaN(body.count) || body.count < 1 || body.count > 50)) {
      throw new ValidationError("Invalid count (must be between 1 and 50)")
    }
  }

  if (body.type === "generate-mcq-batch") {
    if (!body.courseData) throw new ValidationError("Missing course data")
    if (!body.transcript) throw new ValidationError("Missing transcript")
    if (body.count && (isNaN(body.count) || body.count < 1 || body.count > 50)) {
      throw new ValidationError("Invalid count (must be between 1 and 50)")
    }
  }

  // Check content length
  const contentLength = JSON.stringify(body).length
  if (contentLength > 100 * 1024 * 1024) { // 100MB limit (matching bodyParser config)
    throw new ValidationError("Request body too large")
  }
}

// Sanitize response data to prevent accidental exposure of sensitive information
export function sanitizeResponse(responseData: any): any {
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(responseData));
  
  // List of sensitive keys to remove (expand as needed)
  const sensitiveKeys = ['apiKey', 'token', 'secret', 'password', 'credential', 
                         'key', 'auth', 'authorization', 'access_token'];
  
  // Recursive function to sanitize nested objects
  function sanitizeObject(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      // Remove sensitive fields
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } 
      // Recursively sanitize nested objects and arrays
      else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  }
  
  sanitizeObject(sanitized);
  return sanitized;
}

// Apply rate limiting middleware
export async function applyRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    await limiter.check(RATE_LIMIT.REQUESTS_PER_MINUTE, ip)
    return { success: true }
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Calculate retry-after time and rate limit headers
      const retryAfterSeconds = Math.ceil(RATE_LIMIT.INTERVAL_MS / 1000);
      const resetTime = Date.now() + RATE_LIMIT.INTERVAL_MS;

      return { 
        success: false, 
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': RATE_LIMIT.REQUESTS_PER_MINUTE.toString(),
          'X-RateLimit-Reset': resetTime.toString()
        },
        error: "Too many requests. Please try again later.",
        retryAfter: retryAfterSeconds // Add retryAfter property
      }
    }
    // Re-throw unexpected errors
    throw error;
  }
}
