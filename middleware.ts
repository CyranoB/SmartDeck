import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { config } from './lib/config'
import { logSecurityWarning, logConfiguration } from './lib/logging'

const isPublicRoute = createRouteMatcher([
  '/', // Root page
  '/sign-in(.*)', // Sign-in routes
  '/sign-up(.*)', // Sign-up routes
])

/**
 * Helper function to format CSP sources
 * Adds quotes around 'self' and 'unsafe-inline' values
 */
function formatCspSources(sources: string[]): string {
  return sources.map(source => {
    if (source === 'self' || source === 'unsafe-inline' || source === 'unsafe-eval') {
      return `'${source}'`;
    }
    return source;
  }).join(' ');
}

/**
 * Builds the Content Security Policy string from configuration
 */
function buildCspHeader(): string {
  const { csp } = config;
  
  // Log a warning if using permissive defaults
  if (csp.isPermissive) {
    logSecurityWarning('Using permissive CSP defaults which may reduce security. Consider configuring stricter CSP rules in production.', {
      connectSrc: csp.connectSrc,
      scriptSrc: csp.scriptSrc,
      styleSrc: csp.styleSrc
    });
  }
  
  // Log the actual CSP configuration (sanitized)
  logConfiguration('Content-Security-Policy', csp);
  
  return [
    `default-src 'self';`,
    `script-src ${formatCspSources(csp.scriptSrc)};`,
    `style-src ${formatCspSources(csp.styleSrc)};`,
    `img-src ${formatCspSources(csp.imgSrc)};`,
    `font-src ${formatCspSources(csp.fontSrc)};`,
    `connect-src ${formatCspSources(csp.connectSrc)};`,
    `frame-src ${formatCspSources(csp.frameSrc)};`,
    `object-src 'none';`
  ].join(' ');
}

// --- ENHANCED CLERK MIDDLEWARE WITH SECURITY HEADERS ---
export default clerkMiddleware(async (auth, req) => {
  // If the route is NOT public, protect it
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
  
  // Get the response
  const response = NextResponse.next()
  
  // Add Content Security Policy header with dynamic values
  response.headers.set('Content-Security-Policy', buildCspHeader())
  
  // Add other security headers
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return response
})
// --- END ENHANCED MIDDLEWARE ---

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
