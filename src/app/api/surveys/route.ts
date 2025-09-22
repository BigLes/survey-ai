// src/app/api/surveys/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionJWT } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
    const token = (await cookies()).get('session')?.value;
    const session = await verifySessionJWT(token);

    if (!session || session.role === 'VIEWER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const title = String(body.title || '').trim();
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

    if (!title) {
        return NextResponse.json({ error: 'Назва обовʼязкова' }, { status: 400 });
    }

    const incomingQs = Array.isArray(body.questions) ? body.questions : [];
    const questions = incomingQs.map((q, idx: number) => {
        const text = String(q.text || '').trim();
        const type = q.type as string;
        const order = Number.isFinite(q.order) ? q.order : idx;

        let options = null;
        if (type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE') {
            const opts = Array.isArray(q.options?.options) ? q.options.options : [];
            options = { options: opts.filter((s) => typeof s === 'string' && s.trim()).map((s: string) => s.trim()) };
        } else if (type === 'LINEAR_SCALE') {
            const min = Number.isFinite(q.options?.min) ? q.options.min : 1;
            const max = Number.isFinite(q.options?.max) ? q.options.max : 5;
            const labels = {
                1: typeof q.options?.labels?.[1] === 'string' ? q.options.labels[1] : '',
                5: typeof q.options?.labels?.[5] === 'string' ? q.options.labels[5] : '',
            };
            options = { min, max, labels };
        }

        return { text, type, order, options };
    }).filter((q) => q.text && q.type);

    if (questions.length === 0) {
        return NextResponse.json({ error: 'Додайте хоча б одне питання' }, { status: 400 });
    }

    const survey = await prisma.survey.create({
        data: {
            title,
            description,
            status,
            ownerId: session.sub,
            questions: {
                create: questions.map((q) => ({
                    text: q.text,
                    type: q.type,
                    order: q.order,
                    options: q.options ?? undefined
                }))
            }
        },
        select: { id: true }
    });

    return NextResponse.json({ ok: true, id: survey.id });
}
