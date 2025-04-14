/**
 * Application configuration
 * 
 * This module provides centralized access to all configuration values
 * from environment variables with appropriate defaults.
 */

// Helper function to safely parse integer env vars with defaults
const safeParseInt = (envVar: string | undefined, defaultValue: number): number => {
  if (envVar === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Read file size env var once
const maxFileSizeMBValue = safeParseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB, 25);

// Configuration object
export const config = {
  // File size limits - Use NEXT_PUBLIC_ prefix for client-side access
  maxFileSizeMB: maxFileSizeMBValue,
  maxFileSizeBytes: maxFileSizeMBValue * 1024 * 1024,

  // Word count limits
  maxWordCount: safeParseInt(process.env.MAX_WORD_COUNT, 50000),
  minWordCount: safeParseInt(process.env.MIN_WORD_COUNT, 500),

  // Transcript processing
  transcriptWordThreshold: safeParseInt(process.env.TRANSCRIPT_WORD_THRESHOLD, 15000),

  // Rate limiting
  rateLimitRequestsPerMinute: safeParseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE, 10),
  rateLimitIntervalMs: safeParseInt(process.env.RATE_LIMIT_INTERVAL_MS, 60000),
  rateLimitMaxTrackedIps: safeParseInt(process.env.RATE_LIMIT_MAX_TRACKED_IPS, 500),
};

// Helper function to get the current configuration (remains the same)
export function getConfig() {
  return config;
}
