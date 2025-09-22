import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev_secret_change_me');

export type Session = { sub: string; email: string; role: 'ADMIN'|'EDITOR'|'VIEWER' };

export async function createSessionCookie(payload: Session) {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);
    return {
        name: 'session',
        value: token,
        options: {
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60*60*24*7
        }
    };
}

export async function verifySessionJWT(token?: string): Promise<Session|null> {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, secret);
        const s = payload as any;
        if (s?.sub && s?.email && s?.role) return { sub: s.sub, email: s.email, role: s.role };
        return null;
    } catch { return null; }
}

export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
}
export async function checkPassword(raw: string, hash?: string|null) {
    if (!hash) return false;
    return bcrypt.compare(raw, hash);
}
