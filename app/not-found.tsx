export const runtime = "edge";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
        <p className="mt-4 text-gray-600">
          Sorry, the page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}