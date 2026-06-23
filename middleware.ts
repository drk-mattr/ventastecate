import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { LOCK_TO_TECATE } from '@/lib/mvp-config'

export async function middleware(request: NextRequest) {
  // MVP: papryka.co is dormant under the Tecate lock. Serving the app on it
  // causes split-brain auth cookies and stray client-side errors, so redirect
  // every papryka.co request to the canonical ventastecate.com domain. Remove
  // this block (and re-add papryka to lib/brand.ts) when restoring multi-brand.
  if (LOCK_TO_TECATE) {
    const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
    if (host === 'papryka.co' || host === 'www.papryka.co') {
      const canonical = new URL(
        request.nextUrl.pathname + request.nextUrl.search,
        'https://ventastecate.com'
      )
      return NextResponse.redirect(canonical, 301)
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = ['/listings/new', '/my-listings', '/my-stores', '/messages', '/profile/edit']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
