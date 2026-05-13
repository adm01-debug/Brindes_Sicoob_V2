import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Package, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CommercialConditionsProps {
  paymentTerms: string;
  setPaymentTerms: (val: string) => void;
  deliveryMode: "prazo" | "data";
  setDeliveryMode: (mode: "prazo" | "data") => void;
  deliveryTime: string;
  setDeliveryTime: (val: string) => void;
  deliveryDate: Date | undefined;
  setDeliveryDate: (date: Date | undefined) => void;
  shippingType: string;
  setShippingType: (val: string) => void;
  shippingCost: number;
  setShippingCost: (val: number) => void;
  validationErrors: string[];
}

export function CommercialConditions({
  paymentTerms,
  setPaymentTerms,
  deliveryMode,
  setDeliveryMode,
  deliveryTime,
  setDeliveryTime,
  deliveryDate,
  setDeliveryDate,
  shippingType,
  setShippingType,
  shippingCost,
  setShippingCost,
  validationErrors
}: CommercialConditionsProps) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 space-y-3", (validationErrors.includes("prazo_pagamento") || validationErrors.includes("prazo_entrega") || validationErrors.includes("frete") || validationErrors.includes("valor_frete")) ? "border-destructive/50" : "border-border/50")}>
      <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Condições</h3>

      {/* Pagamento */}
      <div className="space-y-1">
        <Label className={cn("text-xs", validationErrors.includes("prazo_pagamento") ? "text-destructive" : "text-muted-foreground")}>
          Prazo | Pagamento {validationErrors.includes("prazo_pagamento") && <span className="ml-1">*</span>}
        </Label>
        <Select value={paymentTerms} onValueChange={setPaymentTerms}>
          <SelectTrigger className={cn("h-8 text-xs", validationErrors.includes("prazo_pagamento") && "border-destructive")}><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="21_dias">21 dias | A partir da entrega</SelectItem>
            <SelectItem value="28_dias">28 dias | A partir da entrega</SelectItem>
            <SelectItem value="50_50">50% entrada / 50% após entrega</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entrega */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className={cn("text-xs", validationErrors.includes("prazo_entrega") ? "text-destructive" : "text-muted-foreground")}>
            Prazo | Entrega {validationErrors.includes("prazo_entrega") && <span className="ml-1">*</span>}
          </Label>
          <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
            <button type="button" onClick={() => { setDeliveryMode("prazo"); setDeliveryTime(""); setDeliveryDate(undefined); }}
              className={cn("px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors", deliveryMode === "prazo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>Prazo</button>
            <button type="button" onClick={() => { setDeliveryMode("data"); setDeliveryTime(""); }}
              className={cn("px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors", deliveryMode === "data" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>Data</button>
          </div>
        </div>
        {deliveryMode === "prazo" ? (
          <Select value={deliveryTime} onValueChange={setDeliveryTime}>
            <SelectTrigger className={cn("h-8 text-xs", validationErrors.includes("prazo_entrega") && "border-destructive")}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="14_dias">14 dias | Após aprovação</SelectItem>
              <SelectItem value="21_dias">21 dias | Após aprovação</SelectItem>
              <SelectItem value="28_dias">28 dias | Após aprovação</SelectItem>
              <SelectItem value="45_dias">45 dias | Após aprovação</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-8 w-full justify-start text-left text-xs font-normal", !deliveryDate && "text-muted-foreground", validationErrors.includes("prazo_entrega") && "border-destructive")}>
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {deliveryDate ? format(deliveryDate, "dd/MM/yyyy") : "Selecione a data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={deliveryDate} onSelect={(date) => { setDeliveryDate(date); setDeliveryTime(date ? `date:${format(date, "yyyy-MM-dd")}` : ""); }} disabled={(date) => date < new Date()} initialFocus />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Frete */}
      <div className="space-y-1">
        <Label className={cn("text-xs", validationErrors.includes("frete") ? "text-destructive" : "text-muted-foreground")}>
          Frete {validationErrors.includes("frete") && <span className="ml-1">*</span>}
        </Label>
        <Select value={shippingType} onValueChange={setShippingType}>
          <SelectTrigger className={cn("h-8 text-xs", validationErrors.includes("frete") && "border-destructive")}><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cif">CIF | Frete grátis</SelectItem>
            <SelectItem value="fob">FOB | Repassado ao cliente</SelectItem>
            <SelectItem value="fob_pre">FOB | Valor pré negociado</SelectItem>
          </SelectContent>
        </Select>
        {(shippingType === "fob_pre" || shippingType === "fob") && (
          <div className="space-y-1 mt-1.5">
            <Label className={cn("text-xs", validationErrors.includes("valor_frete") ? "text-destructive" : "text-muted-foreground")}>
              Valor R$ {validationErrors.includes("valor_frete") && <span className="ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">R$</span>
              <Input type="number" min={0} step={0.01} value={shippingCost || ""} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} placeholder="0,00" className={cn("h-8 text-xs", validationErrors.includes("valor_frete") && "border-destructive")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}