import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired - required for Server Components
    // Add timeout to prevent hanging
    let user = null;
    try {
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 5000)
        );

        const { data } = await Promise.race([authPromise, timeoutPromise]) as any;
        user = data?.user || null;
    } catch (error) {
        console.error('Middleware auth error:', error);
        // Continue without user if auth fails
        user = null;
    }


    const path = request.nextUrl.pathname;

    // 1. Auth Guard
    // Public routes: /login, /public (if any), /api/webhooks (external can't have auth headers usually, but we verify signature)
    const isPublicRoute =
        path === '/login' ||
        path.startsWith('/api/webhooks') ||
        path.startsWith('/_next') ||
        path.startsWith('/static');

    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && path === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // 2. Root Redirect
    if (path === '/' && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
