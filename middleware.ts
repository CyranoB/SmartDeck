import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/', // Root page
  '/sign-in(.*)', // Sign-in routes
  '/sign-up(.*)', // Sign-up routes
])

// --- RESTORED CLERK MIDDLEWARE ---
export default clerkMiddleware(async (auth, req) => {
  // If the route is NOT public, protect it
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
  // If the route IS public, do nothing (allow access)
})
// --- END RESTORED MIDDLEWARE ---

// Minimal pass-through middleware for testing (Remove this)
// export default function middleware() {
//   console.log('Minimal middleware running - PASSING THROUGH');
// }
// Removed extra brace

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
