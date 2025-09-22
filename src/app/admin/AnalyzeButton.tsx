'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function AnalyzeButton({ surveyId }: { surveyId: string }) {
    const [pending, start] = useTransition();
    const r = useRouter();

    return (
        <button
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={pending}
            onClick={() =>
                start(async () => {
                    const res = await fetch(`/api/surveys/${surveyId}/analyze`, { method: 'POST' });
                    if (!res.ok) {
                        const j = await res.json().catch(()=>({}));
                        alert(j.error || 'Помилка аналізу');
                        return;
                    }
                    r.refresh(); // оновити список підсумків
                })
            }
        >
            {pending ? 'Аналізую…' : 'Проаналізувати'}
        </button>
    );
}
