import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit } from '../rate-limit'
import { secureCookieOptions } from '../auth-security'
import { isLaunchGateLocked } from '@/lib/launchGate'

const launchBlockedPrefixes = [
    '/book',
    '/signup',
    '/equipment',
    '/search',
    '/dashboard',
    '/creator-dashboard',
    '/vendor-dashboard',
    '/opportunities',
    '/creators',
    '/pricing',
    '/about',
    '/contact',
    '/blog',
    '/careers',
]

const launchBlockedExactPaths = new Set([
    '/',
])

function isLaunchBlockedPath(pathname: string) {
    return launchBlockedExactPaths.has(pathname)
        || launchBlockedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function updateSession(request: NextRequest) {
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
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, secureCookieOptions(options))
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // 1. RATE LIMITING WALL
    // Extract IP
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Limit to 40 requests per minute per IP for general endpoints
    const isAuthPost = request.method === 'POST'
        && ['/login', '/signup', '/forgot-password', '/update-password'].includes(request.nextUrl.pathname)
    const requestLimit = isAuthPost ? 8 : 40
    const requestWindowMs = isAuthPost ? 15 * 60 * 1000 : 60000
    const { success, remaining, reset } = await rateLimit(`${isAuthPost ? 'auth' : 'general'}:${ip}`, requestLimit, requestWindowMs);
    
    if (!success) {
        return new NextResponse("Too Many Requests. Please slow down and try again.", {
            status: 429,
            headers: {
                'X-RateLimit-Limit': requestLimit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
                'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
            }
        });
    }

    // 2. AUTHENTICATION & ROLE CHECKS

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect dashboard routes
    // Redirect to login if a user tries to access restricted areas without being logged in
    const isDashboardPath = request.nextUrl.pathname.startsWith('/dashboard')
    const isCreatorDashboardPath = request.nextUrl.pathname.startsWith('/creator-dashboard')
    const isVendorDashboardPath = request.nextUrl.pathname.startsWith('/vendor-dashboard')
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/api/admin')
    const isBookPath = request.nextUrl.pathname.startsWith('/book')
    const isOpportunityPath = request.nextUrl.pathname.startsWith('/opportunities')
    const isProtectedPath = isDashboardPath || isCreatorDashboardPath || isVendorDashboardPath || isAdminPath || isBookPath || isOpportunityPath
    const isAuthPath = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup'
    const isEmailConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at)

    let accountType = user?.user_metadata?.account_type
    let hasVendorProviderProfile = false
    const shouldLoadProfile = Boolean(user)
        && (isAuthPath || isDashboardPath || isCreatorDashboardPath || isVendorDashboardPath || isAdminPath || isLaunchGateLocked())

    if (shouldLoadProfile) {
        const { data: profile } = await supabase.from('users').select('account_type').eq('id', user!.id).single()
        accountType = profile?.account_type || accountType
    }

    if (user && isVendorDashboardPath && accountType === 'creator') {
        const { data: vendorProvider } = await supabase
            .from('provider_profiles')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider_type', 'equipment_vendor')
            .maybeSingle()
        hasVendorProviderProfile = Boolean(vendorProvider)
    }

    if (isLaunchGateLocked() && isLaunchBlockedPath(request.nextUrl.pathname)) {
        const isConfirmedAdmin = Boolean(user && isEmailConfirmed && accountType === 'admin')

        if (request.nextUrl.pathname === '/') {
            return supabaseResponse
        }

        if (isConfirmedAdmin && isAdminPath) {
            return supabaseResponse
        }

        const url = request.nextUrl.clone()
        url.pathname = '/'
        url.search = ''
        return NextResponse.redirect(url)
    }

    if (!user && isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && !isEmailConfirmed && (isProtectedPath || isAuthPath)) {
        await supabase.auth.signOut()

        if (isProtectedPath) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'Please verify your email before logging in.')
            return NextResponse.redirect(url)
        }

        return supabaseResponse
    }

    if (user && (isAuthPath || isDashboardPath || isCreatorDashboardPath || isVendorDashboardPath || isAdminPath)) {
        // If they are on the login/signup page and already logged in, redirect them
        if (isAuthPath) {
            const url = request.nextUrl.clone()
            url.pathname = accountType === 'admin' ? '/admin' : accountType === 'creator' ? '/creator-dashboard' : accountType === 'equipment_vendor' ? '/vendor-dashboard' : '/dashboard'
            return NextResponse.redirect(url)
        }

        // Secure Admin routes
        if (isAdminPath && accountType !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = accountType === 'creator' ? '/creator-dashboard' : accountType === 'equipment_vendor' ? '/vendor-dashboard' : '/dashboard'
            return NextResponse.redirect(url)
        }

        // Keep dashboards scoped to their own account type.
        if (isCreatorDashboardPath && accountType !== 'creator') {
            const url = request.nextUrl.clone()
            url.pathname = accountType === 'equipment_vendor' ? '/vendor-dashboard' : '/dashboard'
            return NextResponse.redirect(url)
        }

        if (isVendorDashboardPath && accountType !== 'equipment_vendor' && !hasVendorProviderProfile) {
            const url = request.nextUrl.clone()
            url.pathname = accountType === 'creator' ? '/creator-dashboard' : '/dashboard'
            return NextResponse.redirect(url)
        }

        if (isDashboardPath && accountType !== 'client') {
            const url = request.nextUrl.clone()
            url.pathname = accountType === 'creator' ? '/creator-dashboard' : accountType === 'equipment_vendor' ? '/vendor-dashboard' : '/admin'
            return NextResponse.redirect(url)
        }
    }

    supabaseResponse.headers.set('X-Frame-Options', 'DENY')
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
    supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    return supabaseResponse
}
