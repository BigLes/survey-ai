import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkPassword, createSessionCookie, findUserByEmail } from '@/lib/auth';

export async function POST(req: Request) {
    const { email, password } = await req.json();
    if (!email || !password) {
        return NextResponse.json({ error: 'Email та пароль обовʼязкові' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user || !(await checkPassword(password, user.passwordHash))) {
        return NextResponse.json({ error: 'Невірні дані' }, { status: 401 });
    }

    if (user.role === 'VIEWER') {
        return NextResponse.json({ error: 'Недостатньо прав' }, { status: 403 });
    }

    const cookie = await createSessionCookie({ sub: user.id, email: user.email, role: user.role });
    (await cookies()).set(cookie.name, cookie.value, cookie.options);
    return NextResponse.json({ ok: true });
}
