import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySessionJWT } from '@/lib/auth';
import { LogoutButton } from '@/app/admin/LogoutButton'
import { AnalyzeButton } from '@/app/admin/AnalyzeButton'
import Link from 'next/link'

function explainScope(scope: string) {
    if (scope === 'PER_QUESTION') {
        return 'Запитання'
    }
    if (scope === 'CLUSTER') {
        return 'Обʼєднано'
    }
    return 'Загально'
}

export default async function AdminPage() {
    const token = (await cookies()).get('session')?.value;
    const session = await verifySessionJWT(token);
    if (!session) return null;

    const surveys = await prisma.survey.findMany({
        where: { ownerId: session.sub },
        orderBy: { createdAt: 'desc' },
        include: { summaries: true }
    });

    return (
        <main className="max-w-3xl mx-auto p-6">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white text-black rounded-2xl shadow p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Адмін</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>{session.email} · {session.role}</span>
                            <LogoutButton />
                        </div>
                    </div>

                    {surveys.map(s => (
                        <div key={s.id} className="border rounded p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">{s.title}</div>
                                    <div className="text-xs text-gray-500">ID: {s.id}</div>
                                </div>
                                <Link href={`/admin/surveys/${s.id}/edit`}
                                      className="px-3 py-2 border rounded">Редагувати</Link>
                                <AnalyzeButton surveyId={s.id} />
                            </div>
                            {s.summaries.length > 0 && (
                                <div className="space-y-2">
                                    {s.summaries.map(sum => (
                                        <details key={sum.id} className="border rounded p-2">
                                            <summary
                                                className="cursor-pointer text-sm">{explainScope(sum.scope)} {sum.targetId ? `· ${sum.targetId}` : ''} — <em>{sum.model}</em>
                                            </summary>
                                            <pre className="whitespace-pre-wrap text-sm">{sum.content}</pre>
                                        </details>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </main>
);
}
