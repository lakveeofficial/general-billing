'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function NotFoundContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('q') || '';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="w-full max-w-md rounded-xl border border-black/5 bg-white/50 p-8 text-center shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/50">
        <h1 className="mb-4 text-4xl font-bold text-indigo-600 dark:text-indigo-400">404</h1>
        <h2 className="mb-6 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">Page Not Found</h2>
        {searchQuery && (
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            No results found for <span className="font-medium">"{searchQuery}"</span>
          </p>
        )}
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Go back home
          </Link>
          {searchQuery && (
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Browse all products
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  );
}
