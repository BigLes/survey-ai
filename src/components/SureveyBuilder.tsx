'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type QType = 'SHORT_TEXT'|'LONG_TEXT'|'SINGLE_CHOICE'|'MULTI_CHOICE'|'LINEAR_SCALE';

type QuestionDraft = {
    id?: string;
    text: string;
    type: QType;
    order?: number;
    optionsText?: string;
    min?: number;
    max?: number;
    lowLabel?: string;
    highLabel?: string;
};

type InitialSurvey = {
    id: string;
    title: string;
    description: string | null;
    status: 'DRAFT'|'PUBLISHED';
    questions: Array<{ id: string; text: string; type: QType; order: number; options? }>;
};

export default function SurveyBuilder({
                                          mode = 'create',
                                          initialSurvey
                                      }: {
    mode?: 'create' | 'edit';
    initialSurvey?: InitialSurvey;
}) {
    const r = useRouter();
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [replaceQuestions, setReplaceQuestions] = useState(false); // руйнівна зміна

    const [title, setTitle] = useState(initialSurvey?.title ?? '');
    const [description, setDescription] = useState(initialSurvey?.description ?? '');
    const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'>(initialSurvey?.status ?? 'DRAFT');

    const initialQs: QuestionDraft[] = useMemo(() => {
        if (!initialSurvey) return [{ text: '', type: 'SHORT_TEXT' }];
        return initialSurvey.questions.map(q => {
            const draft: QuestionDraft = {
                id: q.id, text: q.text, type: q.type, order: q.order
            };
            if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') {
                const opts = Array.isArray(q.options?.options) ? q.options.options : [];
                draft.optionsText = opts.join('\n');
            }
            if (q.type === 'LINEAR_SCALE') {
                draft.min = q.options?.min ?? 1;
                draft.max = q.options?.max ?? 5;
                draft.lowLabel = q.options?.labels?.['1'] ?? q.options?.labels?.[1] ?? '';
                draft.highLabel = q.options?.labels?.['5'] ?? q.options?.labels?.[5] ?? '';
            }
            return draft;
        });
    }, [initialSurvey]);

    const [questions, setQuestions] = useState<QuestionDraft[]>(initialQs);

    const setQ = (i: number, patch: Partial<QuestionDraft>) => {
        setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));
    };
    const addQ = () => setQuestions(prev => [...prev, { text: '', type: 'SHORT_TEXT' }]);
    const delQ = (i: number) => setQuestions(prev => prev.filter((_, idx) => idx !== i));
    const move = (i: number, dir: -1|1) => {
        setQuestions(prev => {
            const to = i + dir;
            if (to < 0 || to >= prev.length) return prev;
            const cp = [...prev]; [cp[i], cp[to]] = [cp[to], cp[i]];
            return cp;
        });
    };

    async function onSave() {
        setErr(null);
        if (!title.trim()) { setErr('Вкажіть назву опитування'); return; }
        if (mode === 'create' || replaceQuestions) {
            if (questions.some(q => !q.text.trim())) { setErr('У кожного питання має бути текст'); return; }
        }

        const payloadBase = {
            title: title.trim(),
            description: description.trim() || null,
            status
        };

        let payload = payloadBase;
        if (mode === 'create' || replaceQuestions) {
            payload = {
                ...payloadBase,
                replaceQuestions: true,
                questions: questions.map((q, idx) => {
                    let options = null;
                    if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') {
                        const opts = (q.optionsText || '')
                            .split('\n')
                            .map(s => s.trim())
                            .filter(Boolean);
                        options = { options: opts };
                    }
                    if (q.type === 'LINEAR_SCALE') {
                        const min = Number.isFinite(q.min) ? Number(q.min) : 1;
                        const max = Number.isFinite(q.max) ? Number(q.max) : 5;
                        options = { min, max, labels: { 1: q.lowLabel || '', 5: q.highLabel || '' } };
                    }
                    return { text: q.text.trim(), type: q.type, order: idx, options };
                })
            };
        }

        setBusy(true);
        try {
            const url = mode === 'create'
                ? '/api/surveys'
                : `/api/surveys/${initialSurvey!.id}`;
            const method = mode === 'create' ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const j = await res.json().catch(()=>({}));
                throw new Error(j.error || 'Помилка збереження');
            }
            r.push('/admin');
            r.refresh();
        } catch (e) {
            setErr(e?.message || 'Сталася помилка');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            {err && <div className="text-sm text-red-600">{err}</div>}

            <div className="space-y-2">
                <label className="block text-sm font-medium">Назва</label>
                <input
                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="Назва опитування"
                    value={title}
                    onChange={e=>setTitle(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Опис</label>
                <textarea
                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                    rows={3}
                    placeholder="Короткий опис"
                    value={description ?? ''}
                    onChange={e=>setDescription(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Статус</label>
                <select
                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                    value={status}
                    onChange={e=>setStatus(e.target.value)}
                >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                </select>
            </div>

            {(mode === 'create' || replaceQuestions) && (
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Питання</h2>
                    <button type="button" onClick={addQ} className="px-3 py-2 rounded bg-black text-white">Додати питання</button>
                </div>
            )}

            {(mode === 'create' || replaceQuestions) && questions.map((q, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">#{i+1}</div>
                        <div className="flex gap-2">
                            <button type="button" onClick={()=>move(i,-1)} className="px-2 py-1 border rounded">↑</button>
                            <button type="button" onClick={()=>move(i,1)} className="px-2 py-1 border rounded">↓</button>
                            <button type="button" onClick={()=>delQ(i)} className="px-2 py-1 border rounded">Видалити</button>
                        </div>
                    </div>

                    <input
                        className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                        placeholder="Текст питання"
                        value={q.text}
                        onChange={e=>setQ(i, { text: e.target.value })}
                    />

                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Тип</label>
                            <select
                                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                value={q.type}
                                onChange={e=>setQ(i, { type: e.target.value as QType })}
                            >
                                <option value="SHORT_TEXT">SHORT_TEXT</option>
                                <option value="LONG_TEXT">LONG_TEXT</option>
                                <option value="SINGLE_CHOICE">SINGLE_CHOICE</option>
                                <option value="MULTI_CHOICE">MULTI_CHOICE</option>
                                <option value="LINEAR_SCALE">LINEAR_SCALE</option>
                            </select>
                        </div>
                    </div>

                    {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium">Варіанти (кожен з нового рядка)</label>
                            <textarea
                                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                rows={4}
                                placeholder="варіант 1&#10;варіант 2&#10;варіант 3"
                                value={q.optionsText || ''}
                                onChange={e=>setQ(i, { optionsText: e.target.value })}
                            />
                        </div>
                    )}

                    {q.type === 'LINEAR_SCALE' && (
                        <div className="grid md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium">Мінімум</label>
                                <input type="number"
                                       className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                       value={q.min ?? 1}
                                       onChange={e=>setQ(i, { min: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Максимум</label>
                                <input type="number"
                                       className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                       value={q.max ?? 5}
                                       onChange={e=>setQ(i, { max: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Підпис мін</label>
                                <input
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                    value={q.lowLabel ?? ''}
                                    onChange={e=>setQ(i, { lowLabel: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Підпис макс</label>
                                <input
                                    className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                                    value={q.highLabel ?? ''}
                                    onChange={e=>setQ(i, { highLabel: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {mode === 'edit' && (
                <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={replaceQuestions}
                            onChange={e=>setReplaceQuestions(e.target.checked)}
                        />
                        <span className="text-sm">
              Змінити список питань (видалить усі наявні відповіді до опитування)
            </span>
                    </label>
                    {!replaceQuestions && (
                        <p className="text-xs text-gray-600">
                            У режимі редагування без цієї опції змінюються лише назва/опис/статус.
                        </p>
                    )}
                </div>
            )}

            {(mode === 'create' || replaceQuestions) && (
                <div className="text-xs text-gray-600">
                    Примітка: при зміні списку питань відповіді будуть стерті, щоб уникнути конфліктів структури.
                </div>
            )}

            <div className="flex justify-end">
                <button
                    disabled={busy}
                    onClick={onSave}
                    className="px-4 py-2 rounded-lg bg-black text-white hover:bg-black/90 disabled:opacity-50"
                >
                    {busy ? 'Зберігаємо…' : (mode === 'create' ? 'Створити' : 'Зберегти')}
                </button>
            </div>
        </div>
    );
}
