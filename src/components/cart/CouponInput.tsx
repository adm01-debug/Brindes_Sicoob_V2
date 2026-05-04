
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CouponInput() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const handleApply = async () => {
    if (!code) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Cupom inválido ou expirado");
        return;
      }

      // Basic validation
      const now = new Date();
      if (data.starts_at && new Date(data.starts_at) > now) {
        toast.error("Este cupom ainda não está ativo");
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < now) {
        toast.error("Este cupom expirou");
        return;
      }
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        toast.error("Este cupom atingiu o limite de uso");
        return;
      }

      setAppliedCoupon(data);
      toast.success(`Cupom ${data.code} aplicado!`);
    } catch (err: any) {
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
    return (
      <div className="flex items-center justify-between p-2 border rounded-md bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{appliedCoupon.code}</span>
          <span className="text-xs text-muted-foreground">
            ({appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}% off` : `R$ ${appliedCoupon.discount_value} off`})
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Ticket className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="CUPOM" 
          value={code} 
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="pl-9 uppercase"
        />
      </div>
      <Button 
        variant="outline" 
        onClick={handleApply} 
        disabled={isLoading || !code}
      >
        {isLoading ? "..." : "Aplicar"}
      </Button>
    </div>
  );
}
