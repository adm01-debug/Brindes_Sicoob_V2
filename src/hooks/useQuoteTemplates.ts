import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPromobrindProducts } from "@/lib/external-db";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface QuoteTemplatePersonalization {
  techniqueId?: string;
  techniqueName?: string;
  colorsCount?: number;
  positionsCount?: number;
  unitCost?: number;
  setupCost?: number;
  [key: string]: unknown;
}

export type QuoteTemplateItem = {
  productId: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  colorName?: string;
  colorHex?: string;
  personalizations?: QuoteTemplatePersonalization[];
};

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  items_data: QuoteTemplateItem[] | null;
  discount_percent: number | null;
  discount_amount: number | null;
  payment_terms: string | null;
  delivery_time: string | null;
  is_public: boolean;
  is_default: boolean;
  created_by: string | null;
  seller_id: string;
  notes: string | null;
  internal_notes: string | null;
  category: string | null;
  validity_days: number | null;
  created_at: string;
  updated_at: string;
}

export type CreateTemplateInput = Partial<Omit<QuoteTemplate, 'id' | 'created_at' | 'updated_at'>> &
  Pick<QuoteTemplate, 'name'>;

export function useQuoteTemplates() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

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

  const createTemplate = async (template: CreateTemplateInput) => {
    try {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("quote_templates")
        .insert({
          ...template,
          // items_data é QuoteTemplateItem[] no app, Json no banco — mesmo
          // padrão de serialização usado em useKitVariants.ts/useTemplateSnapshot.ts.
          items_data: template.items_data ? JSON.parse(JSON.stringify(template.items_data)) : template.items_data,
          created_by: user.id,
          seller_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Template salvo com sucesso!");
      fetchTemplates();
      return data as QuoteTemplate;
    } catch (err) {
      console.error("Error creating template:", err);
      toast.error("Erro ao salvar template");
      return null;
    }
  };

  const updateTemplate = async (id: string, template: CreateTemplateInput) => {
    try {
      const { data, error } = await supabase
        .from("quote_templates")
        .update({
          ...template,
          items_data: template.items_data ? JSON.parse(JSON.stringify(template.items_data)) : template.items_data,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Template atualizado com sucesso!");
      fetchTemplates();
      return data as QuoteTemplate;
    } catch (err) {
      console.error("Error updating template:", err);
      toast.error("Erro ao atualizar template");
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

  const validateTemplateItems = async (items: QuoteTemplateItem[]) => {
    if (!items || items.length === 0) return [];
    
    try {
      // Produtos vêm do catálogo externo (Promobrind), não do banco operacional —
      // a tabela local "products" não existe. Ver docs/execucao/evidencias/products_companies_fix_20260917.md
      const productIds = items.map(i => i.productId);
      const data = await fetchPromobrindProducts({
        filters: { id: productIds },
        limit: productIds.length,
      });

      return items.map(item => {
        const product = data?.find(p => p.id === item.productId);
        const currentPrice = product?.sale_price ?? 0;
        return {
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          currentPrice,
          isValid: !!product,
          priceChanged: product ? currentPrice !== item.unitPrice : false
        };
      });
    } catch (err) {
      console.error("Error validating items:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    isLoading,
    /** @deprecated Use `isLoading`; mantido para consumidores anteriores à padronização. */
    loading: isLoading,
    isAdmin,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    validateTemplateItems
  };
}
