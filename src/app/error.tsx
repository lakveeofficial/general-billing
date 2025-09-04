'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white p-4 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md rounded-xl border border-black/5 bg-white/50 p-8 text-center shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/50">
        <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">Something went wrong!</h2>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0">
          <button
            onClick={() => reset()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md bg-zinc-100 px-4 py-2 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
