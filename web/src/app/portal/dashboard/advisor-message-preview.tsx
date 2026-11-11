"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdvisorMessagePreview({
  message,
  caseCaptain,
}: {
  message: string;
  caseCaptain: string;
}) {
  const captainInitials = caseCaptain
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 px-4 pb-2 pt-4 space-y-0">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
            {captainInitials}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-sm">
          Your advisor, {caseCaptain}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="rounded-md bg-muted px-3 py-2.5 text-sm leading-relaxed text-foreground/90">
          {message}
        </div>
      </CardContent>
    </Card>
  );
}
