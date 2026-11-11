'use client'

export const runtime = "edge";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary: catches a render or data failure in
 * any route below the root and shows a branded Spanish page instead
 * of the bare framework error. Same shape as app/not-found.tsx
 * (centered, monochrome, gray-900 primary action).
 *
 * No error-reporting endpoint exists yet, so the failure is only
 * logged to the browser console — do not invent a reporting call.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="font-forum text-xl font-semibold text-gray-900">
          ventastecate.com
        </p>
        <h1 className="mt-6 text-4xl font-bold text-gray-900">
          Algo salió mal
        </h1>
        <p className="mt-4 text-gray-600">
          No pudimos cargar esta página. Inténtalo de nuevo o vuelve al
          inicio.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => reset()}
            className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 hover:bg-gray-100"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
