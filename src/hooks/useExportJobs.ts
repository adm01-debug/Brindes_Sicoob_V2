import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExportJob {
  id: string;
  user_id: string;
  export_type: 'pdf' | 'excel' | 'csv';
  entity_type: 'orders' | 'quotes';
  filters: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  file_url?: string;
  error_message?: string;
  total_count: number;
  created_at: string;
}

export function useExportJobs() {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["export_jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ExportJob[];
    },
  });

  const createJob = useMutation({
    mutationFn: async (job: Omit<ExportJob, "id" | "user_id" | "status" | "attempts" | "created_at" | "total_count">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("export_jobs")
        .insert({
          ...job,
          user_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["export_jobs"] });
      toast.success("Exportação solicitada! Você receberá uma notificação quando estiver pronto.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao solicitar exportação: ${error.message}`);
    },
  });

  const retryJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("export_jobs")
        .update({ status: "pending", attempts: 0, error_message: null })
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["export_jobs"] });
      toast.success("Retentativa solicitada.");
    },
  });

  return {
    jobs,
    isLoading,
    createJob: createJob.mutate,
    retryJob: retryJob.mutate,
  };
}
