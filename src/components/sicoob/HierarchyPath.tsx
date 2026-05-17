import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Building2, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HierarchyPathProps {
  paId?: string;
  className?: string;
}

export function HierarchyPath({ paId, className }: HierarchyPathProps) {
  const { data: hierarchy, isLoading } = useQuery({
    queryKey: ["sicoob-hierarchy-path", paId],
    queryFn: async () => {
      if (!paId) return null;
      const { data, error } = await supabase
        .from('v_sicoob_hierarchy')
        .select('*')
        .eq('pa_id', paId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!paId
  });

  if (isLoading) return <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse"><Loader2 className="h-3 w-3 animate-spin" /> Mapeando ecossistema...</div>;
  if (!hierarchy) return null;

  return (
    <div className={cn("flex items-center flex-wrap gap-1.5 text-[10px] uppercase font-bold tracking-tight text-muted-foreground/70", className)}>
      <div className="flex items-center gap-1 group cursor-default">
        <div className="p-1 rounded bg-muted/50 group-hover:bg-sicoob-green/10 transition-colors">
          <Globe className="h-3 w-3 text-sicoob-green" />
        </div>
        <span>{hierarchy.central_name}</span>
      </div>
      
      <ChevronRight className="h-3 w-3 opacity-30" />

      <div className="flex items-center gap-1 group cursor-default">
        <div className="p-1 rounded bg-muted/50 group-hover:bg-sicoob-green/10 transition-colors">
          <Building2 className="h-3 w-3 text-sicoob-green" />
        </div>
        <span>{hierarchy.singular_name}</span>
      </div>

      <ChevronRight className="h-3 w-3 opacity-30" />

      <div className="flex items-center gap-1 group cursor-default">
        <div className="p-1 rounded bg-sicoob-green/10 text-sicoob-green">
          <MapPin className="h-3 w-3" />
        </div>
        <span className="text-sicoob-green-dark">{hierarchy.pa_name}</span>
      </div>
      
      {hierarchy.tema_name && (
        <>
          <div className="h-3 w-px bg-border/60 mx-1" />
          <div className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1 shadow-sm">
            <span className="text-[9px]">CURADORIA:</span>
            <span>{hierarchy.tema_name}</span>
          </div>
        </>
      )}
    </div>
  );
}
