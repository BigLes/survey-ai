'use client';

import { useRef, useState } from 'react';

type Question = {
    id: string;
    text: string;
    type: 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'LINEAR_SCALE';
    options?: any;
};

type Survey = {
    id: string;
    questions: Question[];
};

export default function SurveyRunner({ survey }: { survey: Survey }) {
    const formRef = useRef<HTMLFormElement | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const opts = (q: Question): string[] => Array.isArray(q.options?.options) ? q.options.options : [];
    const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage(null);
        setSubmitting(true);

        const payload = {
            answers: survey.questions.map((q) => {
                if (q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT') {
                    const el = document.getElementById(`q_${q.id}`) as HTMLInputElement | HTMLTextAreaElement | null;
                    const txt = el?.value?.trim() || null;
                    return { questionId: q.id, valueText: txt };
                }

                if (q.type === 'SINGLE_CHOICE') {
                    const checked = document.querySelector<HTMLInputElement>(`input[name="single_${q.id}"]:checked`);
                    return { questionId: q.id, valueJson: { selected: checked ? checked.value : null } };
                }

                if (q.type === 'MULTI_CHOICE') {
                    const checkedAll = Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="multi_${q.id}"]:checked`));
                    const selected = checkedAll.map(c => c.value);
                    return { questionId: q.id, valueJson: { selected } };
                }

                if (q.type === 'LINEAR_SCALE') {
                    const checked = document.querySelector<HTMLInputElement>(`input[name="scale_${q.id}"]:checked`);
                    return { questionId: q.id, valueJson: { scale: checked ? Number(checked.value) : null } };
                }

                return { questionId: q.id, valueText: null };
            })
        };

        try {
            const res = await fetch(`/api/surveys/${survey.id}/responses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({} as any));
                throw new Error(j?.error || 'Помилка при збереженні');
            }

            formRef.current?.reset();
            setMessage('Дякуємо! Ваша відповідь збережена.');
        } catch (err: any) {
            setMessage(err?.message || 'Сталася помилка. Спробуйте ще раз.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            {message && (
                <div className="mb-4 text-sm p-3 rounded-lg border bg-white text-black">
                    {message}
                </div>
            )}

            <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
                {survey.questions.map((q) => (
                    <div key={q.id} className="space-y-2">
                        <label className="font-medium block">{q.text}</label>

                        {q.type === 'SHORT_TEXT' && (
                            <input
                                id={`q_${q.id}`}
                                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                placeholder="Ваша відповідь"
                            />
                        )}

                        {q.type === 'LONG_TEXT' && (
                            <textarea
                                id={`q_${q.id}`}
                                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                rows={4}
                                placeholder="Ваша відповідь"
                            />
                        )}

                        {q.type === 'SINGLE_CHOICE' && (
                            <div className="flex flex-col gap-2">
                                {opts(q).map((o) => (
                                    <label key={o} className="inline-flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name={`single_${q.id}`} value={o} className="h-4 w-4" />
                                        <span>{o}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {q.type === 'MULTI_CHOICE' && (
                            <div className="flex flex-col gap-2">
                                {opts(q).map((o) => (
                                    <label key={o} className="inline-flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name={`multi_${q.id}`} value={o} className="h-4 w-4" />
                                        <span>{o}</span>
                                    </label>
                                ))}
                                <p className="text-xs text-gray-500">Можна обрати кілька варіантів.</p>
                            </div>
                        )}

                        {q.type === 'LINEAR_SCALE' && (
                            <div className="flex items-center gap-3 flex-wrap">
                                {range(q.options?.min ?? 1, q.options?.max ?? 5).map((val) => (
                                    <label key={val} className="inline-flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name={`scale_${q.id}`} value={val} className="h-4 w-4" />
                                        <span>{val}</span>
                                    </label>
                                ))}
                                {(q.options?.labels?.[1] || q.options?.labels?.[5]) && (
                                    <div className="w-full flex justify-between text-xs text-gray-500">
                                        <span>{q.options?.labels?.[1]}</span>
                                        <span>{q.options?.labels?.[5]}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                <button
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-black text-white hover:bg-black/90 disabled:opacity-50"
                >
                    {submitting ? 'Надсилаємо…' : 'Надіслати'}
                </button>
            </form>
        </>
    );
}
