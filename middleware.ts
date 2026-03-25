import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/utils/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/reset-password', '/logout']

export async function middleware(req: NextRequest) {
  const { supabase, res } = createSupabaseMiddlewareClient(req)

  const { data } = await supabase.auth.getUser()
  const user = data.user

  const { pathname } = req.nextUrl

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api')

  if (!user && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('message', 'auth_required')
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}