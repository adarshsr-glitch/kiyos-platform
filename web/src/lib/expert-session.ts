import { cookies } from "next/headers";

/** The signed-in expert, from the prototype's sign-in cookie (server side). */
export function signedInExpert(): { name: string } | null {
  const raw = cookies().get("kiyos-expert")?.value;
  if (!raw) return null;
  try {
    const me = JSON.parse(decodeURIComponent(raw));
    return typeof me?.name === "string" ? { name: me.name } : null;
  } catch {
    return null;
  }
}

/** Good morning / afternoon / evening, in India. */
export function greeting(): string {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
