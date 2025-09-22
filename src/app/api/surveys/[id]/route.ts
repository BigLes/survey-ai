import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'
import { verifySessionJWT } from '@/lib/auth'

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const survey = await prisma.survey.findUnique({
        where: { id: (await params).id },
        include: { questions: { orderBy: { order: 'asc' } } }
    });
    if (!survey || survey.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(survey);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const token = (await cookies()).get('session')?.value;
    const session = await verifySessionJWT(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const survey = await prisma.survey.findUnique({ where: { id: (await params).id }, select: { ownerId: true } });
    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (survey.ownerId !== session.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(()=>null);
    if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const title = String(body.title || '').trim();
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

    if (!body.replaceQuestions) {
        const updated = await prisma.survey.update({
            where: { id: (await params).id },
            data: { title, description, status }
        });
        return NextResponse.json({ ok: true, id: updated.id });
    }

    const rawQs = Array.isArray(body.questions) ? body.questions : [];
    const questions = rawQs.map((q: any, idx: number) => {
        const text = String(q.text || '').trim();
        const type = q.type as string;
        const order = Number.isFinite(q.order) ? q.order : idx;
        let options: any = null;
        if (type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE') {
            const opts = Array.isArray(q.options?.options) ? q.options.options : [];
            options = { options: opts.filter((s: any) => typeof s === 'string' && s.trim()).map((s: string)=>s.trim()) };
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
    }).filter((q: any) => q.text && q.type);

    if (questions.length === 0) {
        return NextResponse.json({ error: 'Додайте хоча б одне питання' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
        const oldQs = await tx.question.findMany({ where: { surveyId: params.id }, select: { id: true } });
        const oldQIds = oldQs.map(q => q.id);
        if (oldQIds.length) {
            await tx.answer.deleteMany({ where: { questionId: { in: oldQIds } } });
            await tx.question.deleteMany({ where: { id: { in: oldQIds } } });
        }
        await tx.survey.update({
            where: { id: params.id },
            data: { title, description, status }
        });
        await tx.question.createMany({
            data: questions.map((q: any) => ({
                surveyId: params.id,
                text: q.text,
                type: q.type,
                order: q.order,
                options: q.options ?? undefined
            }))
        });
    });

    return NextResponse.json({ ok: true, id: params.id });
}
