import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev_secret_change_me');

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const protectedPath = path.startsWith('/admin') || /^\/api\/surveys\/[^/]+\/analyze$/.test(path);
    if (!protectedPath) return NextResponse.next();

    // @ts-ignore
    const token = req.cookies.get('session')?.value;
    if (!token) {
        if (path.startsWith('/api/')) {
            // @ts-ignore
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }
        const u = req.nextUrl.clone();
        u.pathname = '/';
        return NextResponse.redirect(u);
    }

    try {
        await jwtVerify(token, secret);
        return NextResponse.next();
    } catch {
        if (path.startsWith('/api/')) {
            // @ts-ignore
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }
        const u = req.nextUrl.clone();
        u.pathname = '/';
        return NextResponse.redirect(u);
    }
}

export const config = { matcher: ['/admin/:path*', '/api/surveys/:path*'] };
