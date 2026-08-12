"use client";

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      if (j?.mustReset) {
        window.location.href = '/reset-password/force';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Background image */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <img src="/5513740.jpg" alt="Background" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-white/50" />
      </div>
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-400/40 blur-3xl" />
        <div className="absolute top-10 right-10 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          {/* Branding / Pitch */}
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/40 backdrop-blur px-3 py-1 text-xs text-zinc-700 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Secure Billing Portal
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-semibold leading-tight text-zinc-900">
              Welcome to <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">LakVee Billing</span>
            </h1>
            <p className="mt-3 text-zinc-600 text-sm md:text-base max-w-prose">
              Sign in to manage products, customers, and invoices with a fast and modern billing experience
              designed for medical and general stores.
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-zinc-700">
              <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> GST-ready invoices and HSN support</li>
              <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Multi-business & shop context</li>
              <li className="flex items-center gap-2"><span className="text-emerald-600">✔</span> Role-based access for Admin & Staff</li>
            </ul>
          </div>

          {/* Sign-in Card */}
          <div className="order-1 md:order-2">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-white/30 bg-white/80 backdrop-blur shadow-xl ring-1 ring-black/5">
              <div className="px-6 py-6 md:px-8 md:py-8">
                <div className="flex items-center gap-3 mb-4">
                  <img src="/logo.png" alt="LakVee" className="h-9 w-9 rounded-md object-contain bg-white ring-1 ring-black/10" />
                  <div>
                    <div className="text-sm text-zinc-500">Sign in to</div>
                    <div className="font-semibold">LakVee Billing</div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <form onSubmit={onSubmit} className="grid gap-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-zinc-700">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="you@business.com"
                      required
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-zinc-700">Password</span>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="••••••••"
                        required
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute inset-y-0 right-2 grid place-items-center text-zinc-500 hover:text-zinc-700">
                        {showPwd ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow hover:from-indigo-500 hover:to-fuchsia-500 disabled:opacity-60"
                  >
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>

                <div className="mt-4 text-[12px] text-zinc-500">
                  By signing in you agree to our Terms and Privacy Policy.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
