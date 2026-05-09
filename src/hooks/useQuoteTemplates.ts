import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  items_data: any[] | null;
  discount_percent: number | null;
  payment_terms: string | null;
  delivery_time: string | null;
  is_public: boolean;
  is_default: boolean;
  created_by: string | null;
  seller_id: string | null;
  notes: string | null;
}

export function useQuoteTemplates() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quote_templates")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setTemplates(data as QuoteTemplate[] || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
      toast.error("Erro ao carregar templates");
    } finally {
      setIsLoading(false);
    }
  };

  const createTemplate = async (template: Partial<QuoteTemplate>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("quote_templates")
        .insert({ 
          ...template, 
          created_by: user.id,
          seller_id: user.id 
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Template salvo com sucesso!");
      fetchTemplates();
      return data;
    } catch (err) {
      console.error("Error creating template:", err);
      toast.error("Erro ao salvar template");
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("quote_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template removido");
      fetchTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
      toast.error("Erro ao remover template");
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    isLoading,
    fetchTemplates,
    createTemplate,
    deleteTemplate
  };
}
