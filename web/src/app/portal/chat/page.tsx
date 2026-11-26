import { moved } from "@/lib/moved";

/** Moved to /portal/messages; old links keep working. */
export default function Moved({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  moved("/portal/messages", searchParams);
}
