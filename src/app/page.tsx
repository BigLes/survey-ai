'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [surveyId, setSurveyId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (res.ok) {
      r.push('/admin');
    } else {
      const j = await res.json().catch(() => ({} as any));
      setErr(j?.error || 'Помилка входу');
    }
  };

  const goSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyId.trim()) return;
    r.push(`/s/${surveyId.trim()}`);
  };

  return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl grid md:grid-cols-2 gap-6">
          <div className="bg-white text-black rounded-2xl shadow p-6 space-y-4">
            <h1 className="text-xl font-bold">Вхід для адміна</h1>
            <form onSubmit={login} className="space-y-3">
              <input
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                  placeholder="Email"
                  value={email}
                  onChange={e=>setEmail(e.target.value)}
              />
              <input
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                  placeholder="Пароль"
                  type="password"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
              />
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg bg-black text-white hover:bg-black/90 disabled:opacity-50"
              >
                {loading ? 'Вхід…' : 'Увійти'}
              </button>
            </form>
          </div>
          <div className="bg-white text-black rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-xl font-bold">Перейти до опитування</h2>
            <form onSubmit={goSurvey} className="space-y-3">
              <input
                  className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-black/20"
                  placeholder="Survey ID"
                  value={surveyId}
                  onChange={e=>setSurveyId(e.target.value)}
              />
              <button className="w-full px-4 py-2 rounded-lg bg-black text-white hover:bg-black/90">
                Відкрити
              </button>
            </form>
            <p className="text-xs text-gray-600">
              Публічні респонденти можуть проходити опитування без логіну.
            </p>
          </div>
        </div>
      </main>
  );
}
