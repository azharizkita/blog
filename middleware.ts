import { NextResponse, userAgent } from 'next/server'
import type { NextRequest, MiddlewareConfig } from 'next/server'

export function middleware(request: NextRequest) {
    const { device } = userAgent(request)
    const viewport = device.type === 'mobile' ? 'mobile' : 'desktop'

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-viewport', viewport)
    requestHeaders.set('x-pathname', request.nextUrl.pathname)
    requestHeaders.set('x-params', request.nextUrl.searchParams.toString())

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    return response
}

export const config: MiddlewareConfig = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}