"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CaseDetail } from "./types";
import { tierOf, type CustomerTier } from "./tier";

export type { CustomerTier };

interface CustomerContextValue {
  caseData: CaseDetail;
  tier: CustomerTier;
  firstName: string;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function useCustomer(): CustomerContextValue {
  const value = useContext(CustomerContext);
  if (!value) throw new Error("useCustomer must be used inside the customer portal");
  return value;
}

/** The same, or null outside the customer portal (e.g. the expert's case page). */
export function useCustomerMaybe(): CustomerContextValue | null {
  return useContext(CustomerContext);
}

export function CustomerProvider({ caseData, children }: { caseData: CaseDetail; children: ReactNode }) {
  const tier = tierOf(caseData);
  const firstName = tier === "onboarding" ? "" : caseData.client_name.split(" ")[0];
  return (
    <CustomerContext.Provider value={{ caseData, tier, firstName }}>{children}</CustomerContext.Provider>
  );
}

