/**
 * QuoteOrderBadge — badge clicável que indica que o orçamento foi convertido
 * em pedido. Navega para /pedidos/:id ao clicar.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface QuoteOrderBadgeProps {
  quoteId: string;
  /** Quando true, mostra apenas se houver pedido (silencia loading). */
  silent?: boolean;
}

interface LinkedOrder {
  id: string;
  order_number: string;
  created_at: string;
}

function useLinkedOrder(quoteId: string): LinkedOrder | null {
  const [order, setOrder] = useState<LinkedOrder | null>(null);
  useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    // rls-allow: lookup por quote_id; RLS valida o vendedor e a organização do pedido
    void supabase.from("orders").select("id, order_number, created_at").eq("quote_id", quoteId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setOrder(data as LinkedOrder); });
    return () => { cancelled = true; };
  }, [quoteId]);
  return order;
}

export function QuoteOrderBadge({ quoteId, silent = true }: QuoteOrderBadgeProps) {
  const navigate = useNavigate();
  const order = useLinkedOrder(quoteId);

  if (!order) return silent ? null : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/pedidos/${order.id}`);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/pedidos/${order.id}`);
            }
          }}
          className="inline-flex"
        >
          <Badge
            variant="outline"
            className="gap-1 border-success/40 bg-success/10 text-success hover:bg-success/20 cursor-pointer text-[10px] font-semibold"
          >
            <Package className="h-3 w-3" />
            {order.order_number}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Convertido em pedido — clique para abrir</p>
      </TooltipContent>
    </Tooltip>
  );
}
