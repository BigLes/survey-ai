import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verifySessionJWT } from '@/lib/auth';
import SurveyBuilder from '@/components/SureveyBuilder'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditSurveyPage({ params }: { params: { id: string } }) {
    const store = await cookies();
    const token = store.get('session')?.value;
    const session = await verifySessionJWT(token);
    if (!session) redirect('/');

    const survey = await prisma.survey.findUnique({
        where: { id: (await params).id },
        include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!survey) notFound();
    if (survey.ownerId !== session.sub) redirect('/');

    // передамо мінімальний обʼєкт у клієнтський компонент
    const initial = {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status as 'DRAFT' | 'PUBLISHED',
        questions: survey.questions.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type as any,
            order: q.order,
            options: q.options as any
        }))
    };

    return (
        <main className="min-h-screen bg-black text-white p-6">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white text-black rounded-2xl shadow p-6">
                    <h1 className="text-2xl font-bold mb-4">Редагувати опитування</h1>
                    <SurveyBuilder mode="edit" initialSurvey={initial} />
                </div>
            </div>
        </main>
    );
}
