import { redirect } from "next/navigation";

/**
 * A page that moved (Review 05, UX-13: addresses match their names). Old links, from WhatsApp
 * messages, bookmarks or the demo docs, keep working: same destination, same query.
 */
export function moved(to: string, searchParams: Record<string, string | string[] | undefined> = {}): never {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else if (v !== undefined) q.set(k, v);
  }
  const s = q.toString();
  redirect(s ? `${to}?${s}` : to);
}
