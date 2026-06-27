"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR_STEPS, completeTour, shouldShowTour, type TourStep } from "@/lib/onboarding";
import TourOverlay from "./TourOverlay";

// Delay before the tour auto-starts for a first-time visitor, giving the page a
// moment to settle so the first highlighted element is in place.
const AUTO_START_DELAY_MS = 2000;

type TourContextValue = {
  isActive: boolean;
  index: number;
  total: number;
  currentStep: TourStep | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [index, setIndex] = useState(0);
  // Set once the tour has been started or dismissed by any path (manual button,
  // skip, finish, or the auto-start timer). The pending auto-start checks this
  // so a quick manual start/skip is not clobbered when the timer later fires.
  const hasStartedRef = useRef(false);

  const total = TOUR_STEPS.length;
  const currentStep = isActive ? (TOUR_STEPS[index] ?? null) : null;

  const startTour = useCallback(() => {
    hasStartedRef.current = true;
    setIndex(0);
    setIsActive(true);
  }, []);

  const finish = useCallback(() => {
    hasStartedRef.current = true;
    completeTour();
    setIsActive(false);
  }, []);

  const nextStep = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [total, finish]);

  const prevStep = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const skipTour = useCallback(() => {
    finish();
  }, [finish]);

  const goToPage = useCallback(
    (page: string) => {
      router.push(page);
    },
    [router],
  );

  // Auto-start once for a first-time visitor, after a short settling delay. Skip
  // automated browsers (crawlers, end-to-end tests): a full-screen modal popping
  // up unprompted has nothing to offer them and would intercept their clicks.
  // Manually starting the tour still works everywhere.
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.webdriver) return;
    if (!shouldShowTour()) return;
    const timer = setTimeout(() => {
      // Skip if the visitor already started or dismissed the tour in the
      // meantime, so we never reset their progress or reopen after a skip.
      if (hasStartedRef.current || !shouldShowTour()) return;
      hasStartedRef.current = true;
      setIndex(0);
      setIsActive(true);
    }, AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const value = useMemo<TourContextValue>(
    () => ({
      isActive,
      index,
      total,
      currentStep,
      startTour,
      nextStep,
      prevStep,
      skipTour,
    }),
    [isActive, index, total, currentStep, startTour, nextStep, prevStep, skipTour],
  );

  const needsNavigation = Boolean(currentStep?.page && pathname !== currentStep.page);

  return (
    <TourContext.Provider value={value}>
      {children}
      {isActive && currentStep && (
        <TourOverlay
          step={currentStep}
          index={index}
          total={total}
          needsNavigation={needsNavigation}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onGoToPage={goToPage}
        />
      )}
    </TourContext.Provider>
  );
}
