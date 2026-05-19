import { useQuery } from "@tanstack/react-query";

export function useSmartAlerts() {
  return useQuery({
    queryKey: ["smart-alerts"],
    queryFn: async () => {
      // Mock smart alerts logic
      // In a real app, this would analyze order delays, stock levels, etc.
      return [
        { id: 1, type: "warning", message: "3 pedidos em produção há mais de 5 dias", severity: "high" },
        { id: 2, type: "info", message: "Reposição de estoque sugerida para: Camiseta Dry Fit", severity: "medium" },
        { id: 3, type: "success", message: "Meta de faturamento mensal atingida em 85%", severity: "low" }
      ];
    },
  });
}
