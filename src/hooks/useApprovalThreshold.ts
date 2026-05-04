import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useApprovalThreshold = (items?: any[]) => {
  const { profile, isGestorCompras, isDev, isSupervisor } = useAuth();

  const { data: budget } = useQuery({
    queryKey: ["pa_approval_threshold", profile?.pa_id],
    queryFn: async () => {
      if (!profile?.pa_id) return null;
      const { data, error } = await supabase
        .from("pa_budgets")
        .select("limite_alcada")
        .eq("pa_id", profile.pa_id)
        .eq("ano", new Date().getFullYear())
        .eq("mes", new Date().getMonth() + 1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.pa_id,
  });

  const { data: categoryThresholds } = useQuery({
    queryKey: ["pa_category_thresholds", profile?.pa_id],
    queryFn: async () => {
      if (!profile?.pa_id) return [];
      const { data, error } = await supabase
        .from("pa_category_thresholds")
        .select("*")
        .eq("pa_id", profile.pa_id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.pa_id,
  });

  const needsApproval = (amount: number, currentItems?: any[]) => {
    if (isDev || isSupervisor) return false;
    if (isGestorCompras && !profile?.pa_id) return false;

    // 1. Check Global Threshold
    const globalThreshold = budget?.limite_alcada || 0;
    if (amount > globalThreshold) return true;

    // 2. Check Category-specific Thresholds
    const itemsToCheck = currentItems || items || [];
    for (const item of itemsToCheck) {
      const catThreshold = categoryThresholds?.find(t => t.category_id === item.category_id);
      if (catThreshold && (item.unit_price * item.quantity) > catThreshold.limite_alcada) {
        return true;
      }
    }

    return false;
  };

  return {
    threshold: budget?.limite_alcada || 0,
    categoryThresholds,
    needsApproval,
  };
};
