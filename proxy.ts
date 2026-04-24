import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/utils/supabase/middleware'

const PUBLIC_EXACT_PATHS = ['/']
const PUBLIC_PREFIX_PATHS = ['/jobs', '/login', '/reset-password', '/logout', '/auth', '/api']

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.includes(pathname)) return true
  if (PUBLIC_PREFIX_PATHS.some((path) => pathname.startsWith(path))) return true
  if (pathname.startsWith('/_next')) return true
  if (pathname === '/favicon.ico' || pathname === '/icon.svg') return true
  if (/\.[a-z0-9]+$/i.test(pathname)) return true

  return false
}

export async function proxy(req: NextRequest) {
  const { supabase, res } = createSupabaseMiddlewareClient(req)

  const { data } = await supabase.auth.getUser()
  const user = data.user
  const { pathname } = req.nextUrl

  if (!user && !isPublicPath(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('message', 'auth_required')
    url.searchParams.set('next', `${pathname}${req.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
