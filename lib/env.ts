import fs from 'fs';
import path from 'path';

// Function to parse .env file
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    
    const envContent = fs.readFileSync(filePath, 'utf8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      // Parse key=value pairs
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Error parsing .env file:', error);
    return {};
  }
}

// Function to get environment variables with fallback to .env files
export function getEnvVariable(key: string, defaultValue: string = ''): string {
  // First check process.env
  if (process.env[key]) {
    return process.env[key] as string;
  }
  
  // Then try to read from .env files in order of priority
  const rootDir = process.cwd();
  const envFiles = [
    path.join(rootDir, '.env.local'),
    path.join(rootDir, '.env')
  ];
  
  for (const envFile of envFiles) {
    const envVars = parseEnvFile(envFile);
    if (envVars[key]) {
      return envVars[key];
    }
  }
  
  // Return default value if not found
  return defaultValue;
}

// Only log OpenAI configuration once
let openAiConfigLogged = false;

// Function to get OpenAI configuration
export function getOpenAIConfig() {
  const apiKey = getEnvVariable('OPENAI_API_KEY');
  const model = getEnvVariable('OPENAI_MODEL', 'gpt-4o-mini');
  const baseURL = getEnvVariable('OPENAI_BASE_URL', 'https://api.openai.com/v1');
  
  // Log model and custom endpoint once
  if (!openAiConfigLogged) {
    const isCustomEndpoint = baseURL !== 'https://api.openai.com/v1';
    console.log(`OpenAI Model: ${model}` + (isCustomEndpoint ? `, Custom Endpoint: ${baseURL}` : ''));
    openAiConfigLogged = true;
  }
  
  if (!apiKey) {
    throw new Error('OpenAI API key is missing. Please check your environment variables or .env file.');
  }
  
  return { apiKey, model, baseURL };
}

// Function to get rate limit configuration
export function getRateLimitConfig() {
  const requestsPerMinute = parseInt(getEnvVariable('RATE_LIMIT_REQUESTS_PER_MINUTE', '10'));
  const interval = parseInt(getEnvVariable('RATE_LIMIT_INTERVAL_MS', '60000')); // 60 seconds in ms
  const maxTrackedIPs = parseInt(getEnvVariable('RATE_LIMIT_MAX_TRACKED_IPS', '500'));
  
  // Log configuration status (without exposing values)
  console.log('Rate Limit Config Status:', {
    requestsPerMinute,
    interval,
    maxTrackedIPs,
  });
  
  return { 
    requestsPerMinute,
    interval,
    maxTrackedIPs
  };
} 