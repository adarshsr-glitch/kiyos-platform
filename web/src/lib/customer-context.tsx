"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { setCasePlan } from "./api";

/** The prototype portal runs as a single demo case. */
export const PORTAL_CASE_ID = 1;

export type CustomerTier = "onboarding" | "free" | "premium";

export type JourneyStage =
  | "intake"
  | "initial_report"
  | "upgrade"
  | "dashboard"
  | "complete";

interface OnboardingData {
  personalInfo?: {
    fullName: string;
    dateOfBirth: string;
    nationalities: string[];
    currentCountry: string;
  };
  income?: {
    sources: { type: string; amount: string; currency: string; country: string }[];
  };
  residency?: {
    currentStatus: string;
    visaType: string;
    arrivalDate: string;
    previousCountry: string;
  };
  assets?: {
    items: { type: string; country: string; approximateValue: string }[];
  };
}

interface CustomerContextValue {
  tier: CustomerTier;
  setTier: (t: CustomerTier) => void;
  journeyStage: JourneyStage;
  setJourneyStage: (s: JourneyStage) => void;
  onboardingData: OnboardingData;
  setOnboardingData: (data: OnboardingData) => void;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  upgradeToPremium: () => void;
}

const CustomerContext = createContext<CustomerContextValue>({
  tier: "onboarding",
  setTier: () => {},
  journeyStage: "intake",
  setJourneyStage: () => {},
  onboardingData: {},
  setOnboardingData: () => {},
  onboardingComplete: false,
  completeOnboarding: () => {},
  upgradeToPremium: () => {},
});

export function useCustomer() {
  return useContext(CustomerContext);
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [tier, setTierInternal] = useState<CustomerTier>("onboarding");
  const [journeyStage, setJourneyStageInternal] = useState<JourneyStage>("intake");
  const [onboardingData, setOnboardingDataInternal] = useState<OnboardingData>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedTier = localStorage.getItem("kiyos-customer-tier");
    const storedStage = localStorage.getItem("kiyos-journey-stage");
    const storedData = localStorage.getItem("kiyos-onboarding-data");

    if (storedTier === "onboarding" || storedTier === "free" || storedTier === "premium") {
      setTierInternal(storedTier);
    }
    if (storedStage) {
      setJourneyStageInternal(storedStage as JourneyStage);
    }
    if (storedData) {
      try {
        setOnboardingDataInternal(JSON.parse(storedData));
      } catch {}
    }
    setHydrated(true);
  }, []);

  const setTier = useCallback((t: CustomerTier) => {
    setTierInternal(t);
    localStorage.setItem("kiyos-customer-tier", t);
  }, []);

  const setJourneyStage = useCallback((s: JourneyStage) => {
    setJourneyStageInternal(s);
    localStorage.setItem("kiyos-journey-stage", s);
  }, []);

  const setOnboardingData = useCallback((data: OnboardingData) => {
    setOnboardingDataInternal(data);
    localStorage.setItem("kiyos-onboarding-data", JSON.stringify(data));
  }, []);

  const completeOnboarding = useCallback(() => {
    setTierInternal("free");
    setJourneyStageInternal("initial_report");
    localStorage.setItem("kiyos-customer-tier", "free");
    localStorage.setItem("kiyos-journey-stage", "initial_report");
  }, []);

  const upgradeToPremium = useCallback(() => {
    setTierInternal("premium");
    setJourneyStageInternal("dashboard");
    localStorage.setItem("kiyos-customer-tier", "premium");
    localStorage.setItem("kiyos-journey-stage", "dashboard");
    localStorage.setItem("kiyos-just-upgraded", "true");
  }, []);

  // Keep the server's entitlement in step with the demo tier, so chat limits
  // are enforced by the API rather than only hidden in the UI.
  useEffect(() => {
    if (hydrated && tier !== "onboarding") {
      setCasePlan(PORTAL_CASE_ID, tier).catch(() => {});
    }
  }, [hydrated, tier]);

  const onboardingComplete = tier !== "onboarding";

  if (!hydrated) {
    return null;
  }

  return (
    <CustomerContext.Provider
      value={{
        tier,
        setTier,
        journeyStage,
        setJourneyStage,
        onboardingData,
        setOnboardingData,
        onboardingComplete,
        completeOnboarding,
        upgradeToPremium,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}
