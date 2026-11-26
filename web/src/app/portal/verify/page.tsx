import { moved } from "@/lib/moved";

/** Moved to /portal/profile; old links keep working. */
export default function Moved({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  moved("/portal/profile", searchParams);
}
