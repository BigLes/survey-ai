import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import SurveyRunner from '@/components/SurveyRunner';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SurveyPage({ params }: { params: { id: string } }) {
    const survey = await prisma.survey.findUnique({
        where: { id: (await params).id },
        include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!survey) notFound();

    if (survey.status !== 'PUBLISHED') {
        redirect('/');
    }

    return (
        <main className="min-h-screen bg-black text-white p-6">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white text-black rounded-2xl shadow p-6">
                    <h1 className="text-2xl font-bold">{survey.title}</h1>
                    {survey.description && <p className="text-sm text-gray-600 mt-2">{survey.description}</p>}
                    <div className="mt-6">
                        <SurveyRunner survey={{ id: survey.id, questions: survey.questions as any }} />
                    </div>
                </div>
            </div>
        </main>
    );
}
