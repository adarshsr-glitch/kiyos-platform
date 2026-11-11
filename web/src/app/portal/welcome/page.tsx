"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustomer } from "@/lib/customer-context";

export default function WelcomePage() {
  const { tier } = useCustomer();
  const router = useRouter();

  useEffect(() => {
    if (tier === "onboarding") {
      router.replace("/portal/onboarding");
    } else {
      router.replace("/portal/dashboard");
    }
  }, [tier, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-muted-foreground animate-pulse">
        Redirecting...
      </p>
    </div>
  );
}
