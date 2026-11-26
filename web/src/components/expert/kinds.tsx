import { CheckSquare, FileText, GitCompareArrows, Landmark, MessageCircleQuestion, MessagesSquare, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Kind } from "@/lib/desk";

/** One look per kind of work, used on Home and in Triage, so a kind is recognisable anywhere. */
export const KIND: Record<Kind, { label: string; icon: React.ElementType; tile: string }> = {
  question: { label: "Reply needed", icon: MessageCircleQuestion, tile: "bg-[#E6EEFA] text-[#1F4E8C]" },
  documents: { label: "Documents", icon: FileText, tile: "bg-[#E0F1EB] text-[#1D6B5C]" },
  mismatch: { label: "Mismatch found", icon: GitCompareArrows, tile: "bg-[#EEE9FB] text-[#5B3BB0]" },
  todo: { label: "To-do", icon: CheckSquare, tile: "bg-[#ECEEF2] text-[#3D4356]" },
  notice: { label: "Tax notice", icon: Landmark, tile: "bg-[#FDEDEB] text-[#B42318]" },
  signoff: { label: "Ready to sign off", icon: BadgeCheck, tile: "bg-[#DDF0E5] text-[#0F5132]" },
  reply: { label: "Customer replied", icon: MessagesSquare, tile: "bg-[#E6EEFA] text-[#1F4E8C]" },
};

export function KindTile({ kind, size = 30, className }: { kind: Kind; size?: 22 | 26 | 30; className?: string }) {
  const k = KIND[kind];
  const Icon = k.icon;
  return (
    <span aria-hidden style={{ width: size, height: size }} className={cn("inline-grid shrink-0 place-items-center", size === 22 ? "rounded-[7px]" : "rounded-[9px]", k.tile, className)}>
      <Icon className={size === 22 ? "h-3 w-3" : "h-4 w-4"} />
    </span>
  );
}

export const TONE = {
  late: "bg-[#FDEDEB] text-[#B42318]",
  soon: "bg-[#F1F0EC] text-foreground/80",
  neutral: "bg-[#F1F0EC] text-foreground/70",
  ready: "bg-[#DDF0E5] text-[#0F5132]",
  owed: "bg-[#FBF0DE] text-[#7A3F06]",
} as const;
