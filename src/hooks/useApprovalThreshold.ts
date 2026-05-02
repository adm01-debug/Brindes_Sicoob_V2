import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useApprovalThreshold = () => {
  const { profile, isGestorCompras, isGerentePa, isVendedor, isDev, isSupervisor } = useAuth();

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

  const needsApproval = (amount: number) => {
    // Dev e Supervisor não precisam de aprovação (alcada infinita)
    if (isDev || isSupervisor) return false;

    // Gestor de Compras da Singular geralmente tem alçada maior ou total, 
    // mas aqui seguimos a regra do PA se ele estiver atuando em um contexto de PA.
    if (isGestorCompras && !profile?.pa_id) return false;

    const threshold = budget?.limite_alcada || 0;
    return amount > threshold;
  };

  return {
    threshold: budget?.limite_alcada || 0,
    needsApproval,
  };
};
