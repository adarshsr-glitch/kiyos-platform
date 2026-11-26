"use client";

import { RotateCw } from "lucide-react";

/** A page in the customer workspace failed to load. The side panel stays, so the customer can move on. */
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">This page didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong on our side. Try again, or open another section.
      </p>
      <button
        onClick={reset}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <RotateCw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
