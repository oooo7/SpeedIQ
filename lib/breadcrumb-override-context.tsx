"use client";

import { createContext, useCallback, useContext, useState } from "react";

type BreadcrumbOverrideContextValue = {
  lastCrumbLabel: string | null;
  setLastCrumbLabel: (label: string | null) => void;
};

const BreadcrumbOverrideContext = createContext<BreadcrumbOverrideContextValue | null>(null);

export function BreadcrumbOverrideProvider({ children }: { children: React.ReactNode }) {
  const [lastCrumbLabel, setLastCrumbLabelState] = useState<string | null>(null);
  const setLastCrumbLabel = useCallback((label: string | null) => {
    setLastCrumbLabelState(label);
  }, []);
  return (
    <BreadcrumbOverrideContext.Provider value={{ lastCrumbLabel, setLastCrumbLabel }}>
      {children}
    </BreadcrumbOverrideContext.Provider>
  );
}

export function useBreadcrumbOverride() {
  const ctx = useContext(BreadcrumbOverrideContext);
  return ctx ?? { lastCrumbLabel: null, setLastCrumbLabel: () => {} };
}
