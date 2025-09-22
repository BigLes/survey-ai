import { analyzeSurvey } from '@/lib/analysis';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionJWT } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const token = (await cookies()).get('session')?.value;
    const session = await verifySessionJWT(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const survey = await prisma.survey.findUnique({ where: { id }, select: { ownerId: true } });
    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (survey.ownerId !== session.sub || (session.role !== 'ADMIN' && session.role !== 'EDITOR')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await analyzeSurvey(id);
    return NextResponse.json({ ok: true });
}
