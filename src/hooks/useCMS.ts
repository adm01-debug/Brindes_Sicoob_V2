
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface CMSBanner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: string | null;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

export interface CMSSection {
  id: string;
  name: string;
  type: string;
  content: Json;
  is_active: boolean | null;
  sort_order: number | null;
}

export function useCMS() {
  const bannersQuery = useQuery<CMSBanner[]>({
    queryKey: ["cms-banners"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("cms_banners")
        .select("*")
        .eq("is_active", true)
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const sectionsQuery = useQuery<CMSSection[]>({
    queryKey: ["cms-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  return {
    banners: bannersQuery.data || [],
    sections: sectionsQuery.data || [],
    isLoading: bannersQuery.isLoading || sectionsQuery.isLoading,
    refetch: () => {
      bannersQuery.refetch();
      sectionsQuery.refetch();
    },
  };
}
