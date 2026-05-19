import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDuplicateEntity(tableName: string, queryKey: string[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: entity, error: fetchError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { 
        id: _id, 
        created_at: _ca, 
        updated_at: _ua, 
        order_number: _on, 
        number: _n, 
        ...cleanEntity 
      } = entity;

      const nameFields = ['name', 'title', 'code', 'razao_social'];
      for (const field of nameFields) {
        if (cleanEntity[field]) {
          cleanEntity[field] = `${cleanEntity[field]} (Cópia)`;
          break;
        }
      }

      const { data: newEntity, error: insertError } = await supabase
        .from(tableName)
        .insert(cleanEntity)
        .select()
        .single();

      if (insertError) throw insertError;
      return newEntity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Item duplicado com sucesso!");
    },
    onError: (error: any) => {
      console.error(`Error duplicating entity in ${tableName}:`, error);
      toast.error(`Erro ao duplicar: ${error.message}`);
    },
  });
}
