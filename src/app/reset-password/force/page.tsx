"use client";

import { useState } from 'react';

export default function ForceResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset/force', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      setSuccess(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/80 dark:bg-zinc-900/50 shadow">
        <h1 className="text-xl font-semibold mb-4">Set a new password</h1>
        <p className="text-sm text-zinc-600 mb-4">Your account requires a password reset before you continue.</p>
        {error && <div className="mb-3 rounded bg-red-50 text-red-800 border border-red-200 px-3 py-2 text-sm">{error}</div>}
        {success && <div className="mb-3 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 text-sm">Password updated. Redirecting…</div>}
        <label className="block text-sm mb-3">
          <span className="block text-zinc-600 mb-1">New password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" required />
        </label>
        <label className="block text-sm mb-4">
          <span className="block text-zinc-600 mb-1">Confirm password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" required />
        </label>
        <button type="submit" disabled={loading} className="w-full rounded-md border border-indigo-300 bg-indigo-600 text-white px-3 py-2 text-sm shadow disabled:opacity-60 hover:bg-indigo-500">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
