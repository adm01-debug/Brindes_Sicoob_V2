import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDuplicateEntity(tableName: string, queryKey: string[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch current entity
      const { data: entity, error: fetchError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Prepare new entity (remove unique/auto fields)
      const { 
        id: _id, 
        created_at: _ca, 
        updated_at: _ua, 
        order_number: _on, // Specific for orders
        number: _n, // Common for invoices/quotes
        ...cleanEntity 
      } = entity;

      // Add a mark that it's a copy if it has a title/name field
      const nameFields = ['name', 'title', 'code', 'razao_social'];
      for (const field of nameFields) {
        if (cleanEntity[field]) {
          cleanEntity[field] = `${cleanEntity[field]} (Cópia)`;
          break;
        }
      }

      // 3. Insert duplicate
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
