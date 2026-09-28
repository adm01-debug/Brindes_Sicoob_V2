import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

type ExportRpcClient = {
  rpc: (name: "retry_own_sicoob_export_job", args: { p_job_id: string }) => Promise<{ data: boolean | null; error: Error | null }>;
};

export interface ExportJob {
  id: string;
  user_id: string;
  export_type: 'pdf' | 'excel' | 'csv';
  entity_type: 'orders' | 'quotes';
  filters: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  file_url?: string;
  file_path?: string;
  error_message?: string;
  total_count: number;
  created_at: string;
}

export interface ScheduledExport {
  id: string;
  user_id: string;
  entity_type: 'orders' | 'quotes';
  export_type: 'pdf' | 'excel';
  filters: any;
  frequency: 'daily' | 'weekly' | 'monthly';
  last_run_at: string | null;
  next_run_at: string | null;
  is_active: boolean;
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

  const { data: scheduledExports, isLoading: isLoadingScheduled } = useQuery({
    queryKey: ["scheduled_exports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_exports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ScheduledExport[];
    },
  });

  const createJob = useMutation({
    mutationFn: async (job: Omit<ExportJob, "id" | "user_id" | "status" | "attempts" | "created_at" | "total_count">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("export_jobs")
        .insert({
          entity_type: job.entity_type,
          export_type: job.export_type,
          filters: job.filters as Json,
          error_message: job.error_message,
          file_url: job.file_url,
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
      const { data, error } = await (supabase as unknown as ExportRpcClient).rpc("retry_own_sicoob_export_job", { p_job_id: jobId });
      if (error) throw error;
      if (data !== true) throw new Error("A exportação não pôde ser reenfileirada.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["export_jobs"] });
      toast.success("Retentativa solicitada.");
    },
  });

  const createScheduledExport = useMutation({
    mutationFn: async (exportData: Omit<ScheduledExport, "id" | "user_id" | "created_at" | "last_run_at" | "next_run_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("scheduled_exports")
        .insert({
          ...exportData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_exports"] });
      toast.success("Exportação agendada com sucesso!");
    },
  });

  const deleteScheduledExport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_exports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_exports"] });
      toast.success("Agendamento removido.");
    },
  });

  return {
    jobs,
    scheduledExports,
    isLoading,
    isLoadingScheduled,
    createJob: createJob.mutate,
    retryJob: retryJob.mutate,
    createScheduledExport: createScheduledExport.mutate,
    deleteScheduledExport: deleteScheduledExport.mutate,
  };
}
