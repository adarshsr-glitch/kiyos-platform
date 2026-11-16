"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export type ViewMode = "captain" | "customer";

interface ViewContextValue {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  portalCaseId: number;
}

const ViewContext = createContext<ViewContextValue>({
  mode: "captain",
  setMode: () => {},
  portalCaseId: 1,
});

export function useView() {
  return useContext(ViewContext);
}

export function ViewProvider({ children }: { children: ReactNode }) {
  const [mode, setModeInternal] = useState<ViewMode>("captain");
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("kiyos-view-mode");
    if (stored === "captain" || stored === "customer") {
      setModeInternal(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (mode === "customer" && !pathname.startsWith("/portal")) {
      setModeInternal("customer");
    } else if (mode === "captain" && pathname.startsWith("/portal")) {
      setModeInternal("captain");
    }
  }, [pathname, hydrated, mode]);

  const setMode = (m: ViewMode) => {
    setModeInternal(m);
    localStorage.setItem("kiyos-view-mode", m);
    if (m === "customer") {
      router.push("/portal");
    } else {
      router.push("/");
    }
  };

  return (
    <ViewContext.Provider value={{ mode, setMode, portalCaseId: 1 }}>
      {children}
    </ViewContext.Provider>
  );
}
