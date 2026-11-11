"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustomer } from "@/lib/customer-context";

export default function PortalRootPage() {
  const { tier } = useCustomer();
  const router = useRouter();

  useEffect(() => {
    switch (tier) {
      case "onboarding":
        router.replace("/portal/onboarding");
        break;
      case "free":
      case "premium":
        router.replace("/portal/dashboard");
        break;
    }
  }, [tier, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
}
