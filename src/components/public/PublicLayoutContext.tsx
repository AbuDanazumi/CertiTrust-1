import { createContext, useContext } from "react";

type PublicLayoutActions = {
  openSignIn: () => void;
  openOnboarding: () => void;
};

export const PublicLayoutContext = createContext<PublicLayoutActions | null>(null);

export function usePublicLayout() {
  const ctx = useContext(PublicLayoutContext);
  if (!ctx) {
    throw new Error("usePublicLayout must be used within PublicShell");
  }
  return ctx;
}
