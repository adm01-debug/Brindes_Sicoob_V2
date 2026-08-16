import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"];

interface GenericRow {
  [key: string]: unknown;
}

interface GenericTableClient {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      single: () => Promise<{ data: GenericRow | null; error: { message: string } | null }>;
    };
  };
  insert: (values: GenericRow) => {
    select: () => {
      single: () => Promise<{ data: GenericRow | null; error: { message: string } | null }>;
    };
  };
}

export function useDuplicateEntity(tableName: TableName, queryKey: string[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const rawTable: unknown = supabase.from(tableName);
      const table = rawTable as GenericTableClient;

      const { data: entity, error: fetchError } = await table
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!entity) throw new Error("Registro não encontrado");

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

      const { data: newEntity, error: insertError } = await table
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
    onError: (error: Error) => {
      console.error(`Error duplicating entity in ${tableName}:`, error);
      toast.error(`Erro ao duplicar: ${error.message}`);
    },
  });
}
