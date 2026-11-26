"use client";

export default function CasesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-semibold text-foreground">
        Failed to load cases
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
