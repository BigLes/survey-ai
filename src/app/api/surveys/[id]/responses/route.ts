import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const surveyId = (await params).id;
    const body = await req.json();

    const survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        select: { status: true, questions: { select: { id: true } } },
    });
    if (!survey) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (survey.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Survey is not published' }, { status: 403 });
    }

    const created = await prisma.response.create({
        data: {
            surveyId,
            meta: body.meta ?? {},
            answers: { create: (body.answers ?? []).map((a) => ({
                    questionId: a.questionId,
                    valueText: a.valueText ?? null,
                    valueJson: a.valueJson ?? null
                })) }
        }
    });

    return NextResponse.json({ ok: true, responseId: created.id });
}
