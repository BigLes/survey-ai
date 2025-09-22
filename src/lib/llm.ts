import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function embedTexts(texts: string[]): Promise<number[][]> {

    const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
    });
    return res.data.map(d => d.embedding as number[]);
}

export async function summarize(prompt: string): Promise<string> {
    const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: 'You are a helpful survey analyst.' },
            { role: 'user', content: prompt }]
    });
    return res.choices[0]?.message?.content?.trim() || '';
}
