
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Coupon = Database["public"]["Tables"]["coupons"]["Row"];

function couponValidationError(coupon: Coupon, now = new Date()): string | null {
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return "Este cupom ainda não está ativo";
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return "Este cupom expirou";
  if (coupon.usage_limit && (coupon.usage_count ?? 0) >= coupon.usage_limit) return "Este cupom atingiu o limite de uso";
  return null;
}

async function fetchCoupon(code: string): Promise<Coupon | null> {
  const { data, error } = await supabase.from("coupons").select("*").eq("code", code.toUpperCase()).eq("is_active", true).maybeSingle();
  if (error) throw error;
  return data;
}

function AppliedCoupon({ coupon, onRemove }: { coupon: Coupon; onRemove: () => void }) {
  const discount = coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `R$ ${coupon.discount_value} off`;
  return (
    <div className="flex items-center justify-between p-2 border rounded-md bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{coupon.code}</span><span className="text-xs text-muted-foreground">({discount})</span></div>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}><X className="h-3 w-3" /></Button>
    </div>
  );
}

function CouponForm({ code, loading, onCodeChange, onApply }: { code: string; loading: boolean; onCodeChange: (code: string) => void; onApply: () => void }) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1"><Ticket className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="CUPOM" value={code} onChange={(event) => onCodeChange(event.target.value.toUpperCase())} className="pl-9 uppercase" /></div>
      <Button variant="outline" onClick={onApply} disabled={loading || !code}>{loading ? "..." : "Aplicar"}</Button>
    </div>
  );
}

export function CouponInput() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const handleApply = async () => {
    if (!code) return;
    setIsLoading(true);

    try {
      const data = await fetchCoupon(code);
      if (!data) {
        toast.error("Cupom inválido ou expirado");
        return;
      }
      const validationError = couponValidationError(data);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setAppliedCoupon(data);
      toast.success(`Cupom ${data.code} aplicado!`);
    } catch (err: unknown) {
      toast.error("Erro ao validar cupom");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCode("");
  };

  if (appliedCoupon) {
    return <AppliedCoupon coupon={appliedCoupon} onRemove={removeCoupon} />;
  }

  return <CouponForm code={code} loading={isLoading} onCodeChange={setCode} onApply={handleApply} />;
}
