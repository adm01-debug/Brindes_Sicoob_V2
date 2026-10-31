/**
 * SellerDiscountLimitsPanel — gestão administrativa do limite máximo de desconto por vendedor.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Percent, Save } from "lucide-react";
import { toast } from "sonner";

interface SellerRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  max_discount_percent: number;
}

async function loadSellerLimits(): Promise<SellerRow[]> {
  const { data: profiles, error } = await supabase.from("profiles").select("user_id, full_name, email, role").eq("role", "vendedor");
  if (error) throw error;
  const ids = (profiles || []).map(profile => profile.user_id);
  const { data: limits } = await supabase.from("seller_discount_limits").select("user_id, max_discount_percent").in("user_id", ids);
  const byId = new Map<string, number>(((limits as Array<{ user_id: string; max_discount_percent: number }>) || []).map(limit => [limit.user_id, Number(limit.max_discount_percent)]));
  return (profiles || []).map(profile => ({ user_id: profile.user_id, full_name: profile.full_name, email: profile.email, max_discount_percent: byId.get(profile.user_id) ?? 5 }));
}

function SellerLimitRow({ row, current, savePending, onChange, onSave }: { row: SellerRow; current: number; savePending: boolean; onChange: (value: number) => void; onSave: () => void }) {
  return <div className="flex items-center gap-3 rounded-lg border p-2"><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{row.full_name || "Sem nome"}</p><p className="text-xs text-muted-foreground truncate">{row.email}</p></div><Input type="number" min={0} max={100} step={0.5} value={current} onChange={event => onChange(Number(event.target.value))} className="w-24" /><span className="text-xs text-muted-foreground">%</span><Button size="sm" disabled={current === row.max_discount_percent || savePending} onClick={onSave}><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button></div>;
}

export function SellerDiscountLimitsPanel() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["seller-discount-limits"],
    queryFn: loadSellerLimits,
  });

  const save = useMutation({
    mutationFn: async ({ userId, percent }: { userId: string; percent: number }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("seller_discount_limits")
        .upsert({ user_id: userId, max_discount_percent: percent, set_by: u.user.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Limite atualizado");
      qc.invalidateQueries({ queryKey: ["seller-discount-limits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4 text-primary" /> Limites de desconto por vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="space-y-2">
            {(data ?? []).map(row => { const current = edits[row.user_id] ?? row.max_discount_percent; return <SellerLimitRow key={row.user_id} row={row} current={current} savePending={save.isPending} onChange={value => setEdits(existing => ({ ...existing, [row.user_id]: value }))} onSave={() => save.mutate({ userId: row.user_id, percent: current })} />; })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
