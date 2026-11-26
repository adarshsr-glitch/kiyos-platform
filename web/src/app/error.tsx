"use client";

import { RotateCw } from "lucide-react";

/** Anything that fails before a workspace can draw itself (for example, loading the customer). */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Kiyos couldn&apos;t load this page</h1>
      <p className="max-w-md text-sm text-muted-foreground">Something went wrong on our side. Please try again in a moment.</p>
      <button
        onClick={reset}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <RotateCw className="h-4 w-4" /> Try again
      </button>
    </main>
  );
}
