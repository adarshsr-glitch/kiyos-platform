import { cn } from "@/lib/utils";

const CODES: Record<string, { flag: string; name: string }> = {
  IN: { flag: "🇮🇳", name: "India" },
  US: { flag: "🇺🇸", name: "United States" },
};

export function CountryChip({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const info = CODES[code.toUpperCase()];
  if (!info) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
          className
        )}
      >
        {code}
      </span>
    );
  }
  return (
    <span
      title={info.name}
      className={cn(
        "inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground/80",
        className
      )}
    >
      <span className="text-[11px] leading-none">{info.flag}</span>
      {code.toUpperCase()}
    </span>
  );
}

export function Jurisdictions({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span className="flex gap-1">
      {value
        .split(",")
        .map((j) => j.trim())
        .filter(Boolean)
        .map((j) => (
          <CountryChip key={j} code={j} />
        ))}
    </span>
  );
}
