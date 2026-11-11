'use client'

export const runtime = "edge";

import { useEffect } from "react";
import Link from "next/link";
import "./globals.css";

/**
 * Root error boundary: renders when the root layout itself fails,
 * so it must define its own <html> and <body> and bring its own
 * styles (the layout's globals.css import does not apply here).
 * Same copy and shape as app/error.tsx — one message, one retry,
 * one way home. No error-reporting endpoint exists yet.
 */
export default function GlobalError({
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
    <html lang="es">
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">
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
      </body>
    </html>
  );
}
