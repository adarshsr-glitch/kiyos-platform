"use client";

/** Experts-only notes on the case, in the right rail: write one, read the rest. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addNote, type Brief } from "@/lib/residency";
import { relativeDays } from "@/lib/format";

export function CaseNotes({ caseId, notes }: { caseId: number; notes: Brief["notes"] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await addNote(caseId, text.trim());
      setText("");
      toast.success("Note saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="An observation for the case file. Only experts see notes." className="h-24 w-full rounded-lg border p-2.5 text-[13px]" />
        <button disabled={!text.trim() || busy} onClick={save} className="mt-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold hover:bg-muted disabled:opacity-40">Save note</button>
      </div>
      {notes.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {[...notes].reverse().map((n) => (
            <li key={n.id} className="rounded-lg bg-muted/50 p-3 text-[13px]">
              <p className="text-foreground">{n.body}</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">{n.author} · {relativeDays(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
