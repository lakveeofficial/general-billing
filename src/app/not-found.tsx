import Link from 'next/link';
import { Suspense } from 'react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="w-full max-w-md rounded-xl border border-black/5 bg-white/50 p-8 text-center shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/50">
        <h1 className="mb-4 text-4xl font-bold text-indigo-600 dark:text-indigo-400">404</h1>
        <h2 className="mb-6 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">Page Not Found</h2>
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Suspense fallback={<div className="h-10" />}>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Go back home
          </Link>
        </Suspense>
      </div>
    </div>
  );
}
