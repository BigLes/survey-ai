'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
    const router = useRouter();

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    }

    return (
        <button
            onClick={handleLogout}
            className="px-3 py-1.5 border rounded"
        >
            Вийти
        </button>
    );
}
