/**
 * QuoteCard — card resumido de orçamento para listagens e Kanban.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, User, Calendar, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";
import { OneClickReorderQuote } from "./OneClickReorderQuote";
import { useAuth } from "@/contexts/AuthContext";

export interface QuoteCardData {
  id: string;
  quote_number: string;
  client_name?: string | null;
  client_company?: string | null;
  total: number;
  status: string;
  created_at: string;
  valid_until?: string | null;
}

interface QuoteCardProps {
  quote: QuoteCardData;
  onClick?: () => void;
  className?: string;
}

export function QuoteCard({ quote, onClick, className }: QuoteCardProps) {
  const { isGerentePa } = useAuth();
  const statusCfg = QUOTE_STATUS_CONFIG[quote.status];

  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "transition-all duration-200 hover:shadow-md border-border/50",
        onClick && "cursor-pointer hover:border-primary/40",
        className
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-sm truncate">{quote.quote_number}</span>
          </div>
          <Badge 
            variant={statusCfg?.badgeVariant || "outline"} 
            className={cn("text-[10px] h-5", statusCfg?.badgeClassName)}
          >
            {statusCfg?.label || quote.status}
          </Badge>
        </div>

        <div className="space-y-1">
          {(quote.client_name || quote.client_company) && (
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5 truncate">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{quote.client_company || quote.client_name}</span>
            </p>
          )}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(quote.created_at).toLocaleDateString("pt-BR")}
            </span>
            <span className="font-bold text-foreground tabular-nums">
              R$ {Number(quote.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {isGerentePa && (quote.status === 'approved' || quote.status === 'converted') && (
          <div className="pt-2 border-t border-border/40" onClick={e => e.stopPropagation()}>
            <OneClickReorderQuote quoteId={quote.id} className="w-full h-8 text-[11px]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Building2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

