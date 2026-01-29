import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // This will refresh the session cookie if it's expired.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // If user is logged in
  if (session) {
    // If user is on a public-only page like login, redirect to dashboard
    if (pathname === '/login' || pathname === '/signup') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    // If the user is at the root, redirect to the dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // If user is not logged in and is trying to access a protected route
  const protectedPaths = ['/dashboard', '/workout', '/diet', '/goals', '/progress']
  if (!session && protectedPaths.some(p => pathname.startsWith(p))) {
    // Redirect to login page, but preserve the intended destination
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set(`redirectedFrom`, pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  // Run middleware on all paths except for static assets and API routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/.*).*)',
  ],
}
