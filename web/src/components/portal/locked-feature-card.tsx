"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LockedFeatureCardProps {
  title: string;
  description: string;
  upgradeHref?: string;
  upgradeLabel?: string;
}

export function LockedFeatureCard({
  title,
  description,
  upgradeHref = "/portal/upgrade",
  upgradeLabel = "Upgrade to unlock",
}: LockedFeatureCardProps) {
  return (
    <Card className="relative overflow-hidden border-dashed">
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background/95 backdrop-blur-[2px] z-10" />
      <CardContent className="relative z-20 flex flex-col items-center justify-center py-10 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
        <Button asChild size="sm" className="mt-4 rounded-full px-6">
          <Link href={upgradeHref}>{upgradeLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
