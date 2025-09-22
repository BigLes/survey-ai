import { prisma } from './prisma';
import { embedTexts, summarize } from './llm';
import { kmeans } from './kmeans';

type QType =
    | 'SHORT_TEXT'
    | 'LONG_TEXT'
    | 'SINGLE_CHOICE'
    | 'MULTI_CHOICE'
    | 'LINEAR_SCALE';

const isTextType = (t: QType) => t === 'SHORT_TEXT' || t === 'LONG_TEXT';
function pct(n: number, total: number) {
    return total > 0 ? Math.round((n / total) * 100) : 0;
}

function freqMap(values: string[]) {
    const m = new Map<string, number>();
    for (const v of values) {
        const key = String(v);
        m.set(key, (m.get(key) || 0) + 1);
    }
    return m;
}

function freqToObject(m: Map<string, number>) {
    return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]));
}

function formatTop(m: Map<string, number>, total: number, topN = 5) {
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
    if (top.length === 0) return '—';
    return top.map(([k, c]) => `${k} — ${pct(c, total)}%`).join('; ');
}

function buildClusterPrompt(question: string, answers: string[]) {
    const sample =
        answers
            .slice(0, 40)
            .map((t) => `- ${t}`)
            .join('\n') || '- (порожньо)';
    return `
Ти — аналітик опитувань. Зроби короткий підсумок цього кластера відповідей (3–6 речень).
Питання: "${question}"
Приклади відповідей (до 40):
${sample}
`.trim();
}

function buildQuestionPrompt(
    question: string,
    clusterSummaries: string[],
    totalAnswers: number
) {
    const clustersTxt =
        clusterSummaries.length > 0
            ? clusterSummaries.map((c, i) => `Кластер ${i + 1}: ${c}`).join('\n')
            : '(кластерів немає)';
    return `
Ти — аналітик опитувань. Зроби зведений висновок по питанню на основі підсумків кластерів.
Питання: "${question}"
К-сть відповідей: ${totalAnswers}
Підсумки кластерів:
${clustersTxt}

Формат: 5–8 ключових інсайтів (маркери), а потім 3–5 рекомендацій діями.
`.trim();
}

export async function analyzeSurvey(surveyId: string) {

    // @ts-expect-error
    const questions = await prisma.question.findMany({
        where: { surveyId },
        include: { answers: true },
        orderBy: { order: 'asc' },
    });

    for (const q of questions) {
        const qType = q.type as QType;

        if (isTextType(qType)) {
            const texts = (q.answers ?? [])
                .map((a) => a.valueText?.trim())
                .filter((t): t is string => !!t && t.length > 0);

            // @ts-expect-error
            await prisma.summary.deleteMany({
                where: { surveyId, scope: 'PER_QUESTION', targetId: q.id },
            });
            if (texts.length === 0) {
                continue;
            }

            const vectors = await embedTexts(texts);
            const k = Math.min(5, Math.max(1, Math.floor(texts.length / 10) || 1));
            const { labels } = kmeans(vectors, k);
            const clusters: string[][] = Array.from({ length: k }, () => []);
            texts.forEach((t, i) => clusters[labels[i]]?.push(t));

            const clusterSummaries: string[] = [];
            for (let i = 0; i < clusters.length; i++) {
                const group = clusters[i];
                if (!group || group.length === 0) continue;
                const s = await summarize(buildClusterPrompt(q.text, group));
                clusterSummaries.push(s);
            }

            const questionSummary = await summarize(
                buildQuestionPrompt(q.text, clusterSummaries, texts.length)
            );

            // @ts-expect-error
            await prisma.summary.deleteMany({
                where: { surveyId, scope: 'PER_QUESTION', targetId: q.id },
            });
            // @ts-expect-error
            await prisma.summary.create({
                data: {
                    surveyId,
                    scope: 'PER_QUESTION',
                    targetId: q.id,
                    content: questionSummary,
                    meta: {
                        clusters: clusterSummaries,
                        totalAnswers: texts.length,
                        mode: 'llm+clusters',
                        type: qType,
                    },
                    model: 'gpt-4o-mini',
                },
            });
        } else {
            const vals: string[] = [];
            const scales: number[] = [];
            for (const a of q.answers ?? []) {
                const v = (a.valueJson ?? {}) as any;
                if (typeof v?.selected === 'string') {
                    vals.push(v.selected);
                } else if (Array.isArray(v?.selected)) {
                    v.selected.forEach((s: any) => vals.push(String(s)));
                }
                if (typeof v?.scale === 'number') {
                    scales.push(v.scale);
                    vals.push(String(v.scale));
                }
            }

            // @ts-expect-error
            await prisma.summary.deleteMany({
                where: { surveyId, scope: 'PER_QUESTION', targetId: q.id },
            });

            if (vals.length === 0) {

                continue;
            }

            const total = vals.length;
            const fm = freqMap(vals);
            const topLine = formatTop(fm, total, 5);
            const distribution = [...fm.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, c]) => `${k}: ${c}`)
                .join(', ');

            let extra = '';
            if (qType === 'LINEAR_SCALE' && scales.length > 0) {
                const avg = (scales.reduce((s, x) => s + x, 0) / scales.length).toFixed(2);
                const min = Math.min(...scales);
                const max = Math.max(...scales);
                extra = ` Середнє значення: ${avg}. Діапазон: ${min}–${max}.`;
            }

            const summary =
                `Питання: «${q.text}». Отримано ${total} відповідей.\n` +
                `ТОП варіанти: ${topLine}.\n` +
                `Повний розподіл: ${distribution}.${extra}`;

            await prisma.summary.create({
                data: {
                    surveyId,
                    scope: 'PER_QUESTION',
                    targetId: q.id,
                    content: summary,
                    meta: {
                        frequencies: freqToObject(fm),
                        total,
                        type: qType,
                        scaleStats:
                            qType === 'LINEAR_SCALE' && scales.length
                                ? {
                                    avg:
                                        scales.reduce((s, x) => s + x, 0) / Math.max(scales.length, 1),
                                    min: Math.min(...scales),
                                    max: Math.max(...scales),
                                }
                                : undefined,
                    },
                    model: 'stats@v1',
                },
            });
        }
    }

    const allText = questions.flatMap((q) =>
        (q.answers ?? [])
            .map((a) => {
                const t = a.valueText?.trim();
                return t ? `- [${q.text}] ${t}` : null;
            })
            .filter(Boolean) as string[]
    );

    // @ts-expect-error
    await prisma.summary.deleteMany({
        where: { surveyId, scope: 'SURVEY_GLOBAL' },
    });

    if (allText.length > 0) {
        const sample = allText.slice(0, 200).join('\n');
        const global = await summarize(
            `
Ти — аналітик опитувань. На вході — набір відповідей до 200 рядків у форматі "- [Питання] Відповідь".
Зроби:
1) 7–10 ключових інсайтів (маркери),
2) 3–5 трендів,
3) Executive Summary (≤ 10 речень),
4) 3–7 конкретних дій/рекомендацій.

Відповіді:
${sample}
`.trim()
        );

        await prisma.summary.create({
            data: {
                surveyId,
                scope: 'SURVEY_GLOBAL',
                content: global,
                meta: { totalTextAnswers: allText.length, mode: 'llm-global' },
                model: 'gpt-4o-mini',
            },
        });
    } else {

        const choiceStats = questions
            .filter((q) => !isTextType(q.type as QType))
            .map((q) => {
                const vals: string[] = [];
                const scales: number[] = [];
                for (const a of q.answers ?? []) {
                    const v = (a.valueJson ?? {}) as any;
                    if (typeof v?.selected === 'string') vals.push(v.selected);
                    else if (Array.isArray(v?.selected)) v.selected.forEach((s: any) => vals.push(String(s)));
                    if (typeof v?.scale === 'number') {
                        scales.push(v.scale);
                        vals.push(String(v.scale));
                    }
                }
                const fm = freqMap(vals);
                const total = vals.length;
                const top = formatTop(fm, total, 3);
                const base = `• «${q.text}»: ${total} відповідей. ТОП: ${top}.`;
                if ((q.type as QType) === 'LINEAR_SCALE' && scales.length) {
                    const avg = (scales.reduce((s, x) => s + x, 0) / scales.length).toFixed(2);
                    return `${base} Середнє: ${avg}.`;
                }
                return base;
            })
            .join('\n');

        const global =
            `Глобальне узагальнення (без текстових відповідей):\n` +
            `${choiceStats || 'Немає відповідей для аналізу.'}`;

        await prisma.summary.create({
            data: {
                surveyId,
                scope: 'SURVEY_GLOBAL',
                content: global,
                meta: { mode: 'fallback-global' },
                model: 'stats@v1',
            },
        });
    }
}
