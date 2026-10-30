import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ApprovalItem {
  category_id?: string | null;
  unit_price: number;
  quantity: number;
}

interface CategoryThreshold {
  category_id: number | null;
  limite_alcada: number;
}

function globalApprovalThreshold(profileThreshold?: number | null, budgetThreshold?: number | null): number {
  return profileThreshold || budgetThreshold || 0;
}

function exceedsCategoryThreshold(items: ApprovalItem[], thresholds?: CategoryThreshold[] | null): boolean {
  return items.some(item => {
    const threshold = thresholds?.find(candidate => candidate.category_id !== null && String(candidate.category_id) === item.category_id);
    return Boolean(threshold && item.unit_price * item.quantity > threshold.limite_alcada);
  });
}

function approvalRequired(input: {
  amount: number;
  items: ApprovalItem[];
  isDev: boolean;
  isSupervisor: boolean;
  isGestorCompras: boolean;
  paId?: string | null;
  globalThreshold: number;
  categoryThresholds?: CategoryThreshold[] | null;
}): boolean {
  if (input.isDev || input.isSupervisor) return false;
  if (input.isGestorCompras && !input.paId) return false;
  if (input.amount > input.globalThreshold) return true;
  return exceedsCategoryThreshold(input.items, input.categoryThresholds);
}

export const useApprovalThreshold = (items?: ApprovalItem[]) => {
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

  const needsApproval = (amount: number, currentItems?: ApprovalItem[]) => {
    return approvalRequired({
      amount,
      items: currentItems || items || [],
      isDev,
      isSupervisor,
      isGestorCompras,
      paId: profile?.pa_id,
      globalThreshold: globalApprovalThreshold(profile?.approval_threshold, budget?.limite_alcada),
      categoryThresholds,
    });
  };

  return {
    threshold: globalApprovalThreshold(undefined, budget?.limite_alcada),
    categoryThresholds,
    needsApproval,
  };
};
