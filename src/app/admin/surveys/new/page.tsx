import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionJWT } from '@/lib/auth';
import SurveyBuilder from '@/components/SureveyBuilder'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewSurveyPage() {
    const token = (await cookies()).get('session')?.value;
    const session = await verifySessionJWT(token);

    if (!session || session.role === 'VIEWER') {
        redirect('/');
    }

    return (
        <main className="min-h-screen bg-black text-white p-6">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white text-black rounded-2xl shadow p-6">
                    <h1 className="text-2xl font-bold mb-4">Створити опитування</h1>
                    <SurveyBuilder />
                </div>
            </div>
        </main>
    );
}
