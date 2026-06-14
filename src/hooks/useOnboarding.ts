
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ONBOARDING_STEPS } from "@/constants/onboarding";
export { ONBOARDING_STEPS } from "@/constants/onboarding";

export function useOnboarding() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);

  // Fetch onboarding status
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchOnboarding = async () => {
      try {
        const { data, error } = await supabase
          .from("user_onboarding")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("[onboarding] Error fetching status:", error);
          return;
        }

        if (data) {
          setOnboardingId(data.id);
          setHasCompletedTour(data.has_completed_tour || false);
          setCurrentStep(data.current_step || 0);
          if (!data.has_completed_tour) setShowTour(true);
        } else {
          // Create onboarding record for new user
          const { data: newData, error: insertError } = await supabase
            .from("user_onboarding")
            .insert({ user_id: user.id, has_completed_tour: false, current_step: 0 })
            .select().single();

          if (insertError) {
            console.error("[onboarding] Error creating record:", insertError);
          } else if (newData) {
            setOnboardingId(newData.id);
            setShowTour(true);
          }
        }
      } catch (err) {
        console.error("[onboarding] Unexpected error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnboarding();
  }, [user]);

  const updateStep = useCallback(async (step: number) => {
    setCurrentStep(step);
    console.log(`[onboarding] Avançando para o passo ${step}`, { onboardingId, userId: user?.id });

    if (!user || !onboardingId) return;

    try {
      const { error } = await supabase
        .from("user_onboarding")
        .update({
          current_step: step,
          completed_steps: ONBOARDING_STEPS.slice(0, step).map((s) => s.id),
        })
        .eq("id", onboardingId);

      if (error) throw error;
    } catch (err) {
      console.error("[onboarding] Falha ao persistir passo no banco:", err);
      toast.error("Feedback: O progresso do tour não pôde ser salvo, mas você pode continuar navegando.");
    }
  }, [user, onboardingId]);

  const completeTour = useCallback(async () => {
    setShowTour(false);
    setHasCompletedTour(true);
    if (!user || !onboardingId) return;

    try {
      await supabase
        .from("user_onboarding")
        .update({
          has_completed_tour: true,
          completed_at: new Date().toISOString(),
          completed_steps: ONBOARDING_STEPS.map((s) => s.id),
        })
        .eq("id", onboardingId);
    } catch (err) {
      console.error("[onboarding] Falha ao salvar conclusão:", err);
    }
  }, [user, onboardingId]);

  const skipTour = useCallback(async () => {
    setShowTour(false);
    setHasCompletedTour(true);
    if (!user || !onboardingId) return;

    try {
      await supabase
        .from("user_onboarding")
        .update({ has_completed_tour: true, completed_at: new Date().toISOString() })
        .eq("id", onboardingId);
    } catch (err) {
      console.error("[onboarding] Falha ao salvar skip:", err);
    }
  }, [user, onboardingId]);

  const restartTour = useCallback(async () => {
    if (!user || !onboardingId) return;
    setCurrentStep(0);
    setShowTour(true);
    setHasCompletedTour(false);

    await supabase
      .from("user_onboarding")
      .update({ has_completed_tour: false, current_step: 0, completed_steps: [], completed_at: null })
      .eq("id", onboardingId);
  }, [user, onboardingId]);

  return {
    isLoading, showTour, setShowTour, currentStep, hasCompletedTour,
    currentStepData: ONBOARDING_STEPS[currentStep],
    totalSteps: ONBOARDING_STEPS.length,
    nextStep: () => currentStep < ONBOARDING_STEPS.length - 1 ? updateStep(currentStep + 1) : completeTour(),
    prevStep: () => currentStep > 0 ? updateStep(currentStep - 1) : null,
    skipTour, completeTour, restartTour,
  };
}
