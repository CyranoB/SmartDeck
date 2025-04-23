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

// Helper function to safely parse a comma-separated list with defaults
const parseListEnvVar = (envVar: string | undefined, defaultValue: string[]): string[] => {
  if (!envVar) {
    return defaultValue;
  }
  return envVar.split(',').map(item => item.trim()).filter(Boolean);
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
  
  // Content Security Policy
  csp: {
    // Default sources for connect-src directive
    // More permissive defaults to prioritize availability over strict security
    connectSrc: parseListEnvVar(
      process.env.CSP_CONNECT_SRC,
      ['self', 'https://*', 'wss://*', 'http://*', 'ws://*'] // Allow all HTTPS/WSS and HTTP/WS connections as fallback
    ),
    // Default sources for script-src directive
    scriptSrc: parseListEnvVar(
      process.env.CSP_SCRIPT_SRC, 
      ['self', 'unsafe-inline', 'unsafe-eval', 'https://*'] // Allow all HTTPS scripts
    ),
    // Default sources for style-src directive
    styleSrc: parseListEnvVar(
      process.env.CSP_STYLE_SRC,
      ['self', 'unsafe-inline', 'https://*'] // Allow all HTTPS styles
    ),
    // Default sources for img-src directive
    imgSrc: parseListEnvVar(
      process.env.CSP_IMG_SRC,
      ['self', 'blob:', 'data:', 'https://*'] // Allow all HTTPS images
    ),
    // Default sources for font-src directive
    fontSrc: parseListEnvVar(
      process.env.CSP_FONT_SRC,
      ['self', 'https://*'] // Allow all HTTPS fonts
    ),
    // Default sources for frame-src directive
    frameSrc: parseListEnvVar(
      process.env.CSP_FRAME_SRC,
      ['self', 'https://*'] // Allow all HTTPS frames
    ),
    // Flag to indicate if we're using permissive defaults
    isPermissive: true
  }
};

// Helper function to get the current configuration
export function getConfig() {
  return config;
}
