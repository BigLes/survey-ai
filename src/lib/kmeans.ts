export function kmeans(vectors: number[][], k: number) {

    if (vectors.length === 0) return { labels: [] as number[], centroids: [] as number[][] };
    k = Math.max(1, Math.min(k, vectors.length));

    let centroids = vectors.slice(0, k).map(v => v.slice());

    const maxIter = 20;
    const labels = new Array(vectors.length).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {

        for (let i = 0; i < vectors.length; i++) {
            let best = 0, bestDist = Infinity;
            for (let c = 0; c < k; c++) {
                const d = euclid(vectors[i], centroids[c]);
                if (d < bestDist) { bestDist = d; best = c; }
            }
            labels[i] = best;
        }

        const sums = Array.from({ length: k }, () => new Array(vectors[0].length).fill(0));
        const counts = new Array(k).fill(0);
        for (let i = 0; i < vectors.length; i++) {
            const c = labels[i];
            counts[c]++;
            for (let j = 0; j < vectors[i].length; j++) sums[c][j] += vectors[i][j];
        }
        for (let c = 0; c < k; c++) {
            if (counts[c] === 0) continue;
            for (let j = 0; j < sums[c].length; j++) sums[c][j] /= counts[c];
        }
        centroids = sums;
    }
    return { labels, centroids };
}

function euclid(a: number[], b: number[]) {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
}
