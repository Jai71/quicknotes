"use client";

import { useEffect, useRef } from "react";
import { logError } from "@/lib/supabase/log";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    // In dev, React Strict Mode can invoke effects twice; avoid duplicate logs.
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;

    logError("app.errorBoundary", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto"> 
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-600">
        Try again. If it keeps happening, refresh.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-gray-500">Error ID: {error.digest}</p>
      ) : null}
      <button className="mt-4 px-3 py-2 rounded-md border" onClick={reset}>
        Retry
      </button>
    </main>
  );
}