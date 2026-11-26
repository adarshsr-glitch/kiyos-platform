import { cn } from "@/lib/utils";

/**
 * A customer's initials on a soft tint that is always the same for the same name, so a face
 * is recognisable across Home, Work and Cases. Cool hues only: red means late and amber means
 * the customer's turn, so neither is used for identity.
 */

const HUES: [string, string][] = [
  ["#E4ECF7", "#1F4E8C"],
  ["#ECE8FA", "#4B3BA8"],
  ["#E1F1EC", "#1D6B5C"],
  ["#F2E7F4", "#7A2E86"],
  ["#E3EFF6", "#245A7A"],
  ["#ECEEE2", "#4F5A1E"],
  ["#E9EAF0", "#3D4356"],
];

export function initialsOf(name: string): string {
  const parts = name.replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "").replace(/&/g, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Face({ name, size = 24, className }: { name: string; size?: 20 | 24 | 28; className?: string }) {
  const [bg, fg] = HUES[Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0) % HUES.length];
  return (
    <span
      aria-hidden
      style={{ background: bg, color: fg, width: size, height: size, fontSize: size <= 20 ? 8.5 : size === 24 ? 9.5 : 10.5 }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[0.02em]", className)}
    >
      {initialsOf(name)}
    </span>
  );
}
