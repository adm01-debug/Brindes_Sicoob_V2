import { useNavigate } from "react-router-dom";
import { Building2, CalendarClock, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSupplierColors } from "@/lib/supplier-colors";
import type { ReactNode } from "react";

interface ProductInfoBarProps {
  sku: string;
  supplierName: string;
  supplierId?: string;
  onOpenFutureStock: () => void;
  onOpenSupplierComparison: () => void;
  hasFutureStock?: boolean;
}

function SupplierLink({ supplierName, supplierId, onClick }: { supplierName: string; supplierId?: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("text-xs px-3 py-1.5 rounded-full font-medium border-border bg-card transition-all duration-200 hover:scale-[1.02] group/supplier", supplierId && "cursor-pointer")} style={{ ['--supplier-color' as string]: getSupplierColors(supplierName).hex }} onClick={onClick}>
          <Building2 className={cn("h-3.5 w-3.5 mr-1.5 transition-colors", getSupplierColors(supplierName).text)} /><span className="group-hover/supplier:text-[var(--supplier-color)] transition-colors">{supplierName}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>Ver todos os produtos de {supplierName}</TooltipContent>
    </Tooltip>
  );
}

function InfoAction({ label, tooltip, onClick, icon }: { label: string; tooltip: string; onClick: () => void; icon: ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" onClick={onClick} className="rounded-full h-8 px-3 text-xs gap-1.5">{icon}{label}</Button></TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>;
}

export function ProductInfoBar({ sku, supplierName, supplierId, onOpenFutureStock, onOpenSupplierComparison }: ProductInfoBarProps) {
  const navigate = useNavigate();

  const handleSupplierClick = () => {
    if (supplierId) {
      navigate(`/filtros?supplier=${supplierId}`);
    }
  };
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge variant="secondary" className="font-mono text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted">SKU: {sku}</Badge>
      <SupplierLink supplierName={supplierName} supplierId={supplierId} onClick={handleSupplierClick} />
      <InfoAction label="Estoque Futuro" tooltip="Ver previsão de reposição de estoque" onClick={onOpenFutureStock} icon={<CalendarClock className="h-3.5 w-3.5 text-orange" />} />
      <InfoAction label="Comparar Fornecedores" tooltip="Ver mesmo produto em outros fornecedores" onClick={onOpenSupplierComparison} icon={<GitCompare className="h-3.5 w-3.5 text-muted-foreground" />} />
    </div>
  );
}
