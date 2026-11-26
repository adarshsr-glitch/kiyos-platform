"use client";

/**
 * Cases has two views of the same work: by customer (the book) and Triage (one item at a time,
 * done in place). This switch sits in the page bar on both, so moving between them is one press.
 */

import { useRouter } from "next/navigation";
import { Tabs } from "./tabs";

export function ViewSwitch({ view, open, all }: { view: "customers" | "triage"; open: number; all: boolean }) {
  const router = useRouter();
  return (
    <Tabs
      label="View"
      value={view}
      onChange={(v) => router.push(`/expert/cases${v === "triage" ? "?view=triage" : ""}${all ? `${v === "triage" ? "&" : "?"}all=1` : ""}`)}
      tabs={[
        { key: "customers", label: "By customer" },
        { key: "triage", label: "Triage", count: open },
      ]}
    />
  );
}
