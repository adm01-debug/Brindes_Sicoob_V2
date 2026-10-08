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

const FIELD_LABEL_CLASS = "text-xs";
const INVALID_LABEL_CLASS = "text-destructive";
const MUTED_LABEL_CLASS = "text-muted-foreground";
const INVALID_BORDER_CLASS = "border-destructive";
const SELECT_TRIGGER_CLASS = "h-8 text-xs";

function fieldError(errors: string[], field: string): boolean {
  return errors.includes(field);
}

function RequiredMark({ show }: { show: boolean }) {
  return show ? <span className="ml-1">*</span> : null;
}

function PaymentConditions({ paymentTerms, setPaymentTerms, validationErrors }: Pick<CommercialConditionsProps, "paymentTerms" | "setPaymentTerms" | "validationErrors">) {
  const invalid = fieldError(validationErrors, "prazo_pagamento");
  return (
    <div className="space-y-1">
      <Label className={cn(FIELD_LABEL_CLASS, invalid ? INVALID_LABEL_CLASS : MUTED_LABEL_CLASS)}>Prazo | Pagamento <RequiredMark show={invalid} /></Label>
      <Select value={paymentTerms} onValueChange={setPaymentTerms}>
        <SelectTrigger className={cn(SELECT_TRIGGER_CLASS, invalid && INVALID_BORDER_CLASS)}><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent><SelectItem value="21_dias">21 dias | A partir da entrega</SelectItem><SelectItem value="28_dias">28 dias | A partir da entrega</SelectItem><SelectItem value="50_50">50% entrada / 50% após entrega</SelectItem></SelectContent>
      </Select>
    </div>
  );
}

function DeliveryConditions(props: Pick<CommercialConditionsProps, "deliveryMode" | "setDeliveryMode" | "deliveryTime" | "setDeliveryTime" | "deliveryDate" | "setDeliveryDate" | "validationErrors">) {
  const { deliveryMode, setDeliveryMode, deliveryTime, setDeliveryTime, deliveryDate, setDeliveryDate, validationErrors } = props;
  const invalid = fieldError(validationErrors, "prazo_entrega");
  const changeMode = (mode: "prazo" | "data") => { setDeliveryMode(mode); setDeliveryTime(""); if (mode === "prazo") setDeliveryDate(undefined); };
  const selectDate = (date: Date | undefined) => { setDeliveryDate(date); setDeliveryTime(date ? `date:${format(date, "yyyy-MM-dd")}` : ""); };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className={cn(FIELD_LABEL_CLASS, invalid ? INVALID_LABEL_CLASS : MUTED_LABEL_CLASS)}>Prazo | Entrega <RequiredMark show={invalid} /></Label>
        <div className="flex gap-0.5 rounded-md bg-muted p-0.5"><button type="button" onClick={() => changeMode("prazo")} className={cn("px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors", deliveryMode === "prazo" ? "bg-background text-foreground shadow-sm" : MUTED_LABEL_CLASS)}>Prazo</button><button type="button" onClick={() => changeMode("data")} className={cn("px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors", deliveryMode === "data" ? "bg-background text-foreground shadow-sm" : MUTED_LABEL_CLASS)}>Data</button></div>
      </div>
      {deliveryMode === "prazo" ? <Select value={deliveryTime} onValueChange={setDeliveryTime}><SelectTrigger className={cn(SELECT_TRIGGER_CLASS, invalid && INVALID_BORDER_CLASS)}><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="14_dias">14 dias | Após aprovação</SelectItem><SelectItem value="21_dias">21 dias | Após aprovação</SelectItem><SelectItem value="28_dias">28 dias | Após aprovação</SelectItem><SelectItem value="45_dias">45 dias | Após aprovação</SelectItem></SelectContent></Select> : <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("h-8 w-full justify-start text-left text-xs font-normal", !deliveryDate && MUTED_LABEL_CLASS, invalid && INVALID_BORDER_CLASS)}><CalendarIcon className="mr-2 h-3.5 w-3.5" />{deliveryDate ? format(deliveryDate, "dd/MM/yyyy") : "Selecione a data"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={deliveryDate} onSelect={selectDate} disabled={date => date < new Date()} initialFocus /></PopoverContent></Popover>}
    </div>
  );
}

function ShippingConditions(props: Pick<CommercialConditionsProps, "shippingType" | "setShippingType" | "shippingCost" | "setShippingCost" | "validationErrors">) {
  const { shippingType, setShippingType, shippingCost, setShippingCost, validationErrors } = props;
  const shippingInvalid = fieldError(validationErrors, "frete");
  const costInvalid = fieldError(validationErrors, "valor_frete");
  const showCost = shippingType === "fob_pre" || shippingType === "fob";
  return (
    <div className="space-y-1">
      <Label className={cn(FIELD_LABEL_CLASS, shippingInvalid ? INVALID_LABEL_CLASS : MUTED_LABEL_CLASS)}>Frete <RequiredMark show={shippingInvalid} /></Label>
      <Select value={shippingType} onValueChange={setShippingType}><SelectTrigger className={cn(SELECT_TRIGGER_CLASS, shippingInvalid && INVALID_BORDER_CLASS)}><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="cif">CIF | Frete grátis</SelectItem><SelectItem value="fob">FOB | Repassado ao cliente</SelectItem><SelectItem value="fob_pre">FOB | Valor pré negociado</SelectItem></SelectContent></Select>
      {showCost && <div className="space-y-1 mt-1.5"><Label className={cn(FIELD_LABEL_CLASS, costInvalid ? INVALID_LABEL_CLASS : MUTED_LABEL_CLASS)}>Valor R$ <RequiredMark show={costInvalid} /></Label><div className="flex items-center gap-1.5"><span className={cn(FIELD_LABEL_CLASS, MUTED_LABEL_CLASS)}>R$</span><Input type="number" min={0} step={0.01} value={shippingCost || ""} onChange={event => setShippingCost(parseFloat(event.target.value) || 0)} placeholder="0,00" className={cn(SELECT_TRIGGER_CLASS, costInvalid && INVALID_BORDER_CLASS)} /></div></div>}
    </div>
  );
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
  const hasError = validationErrors.some(error => ["prazo_pagamento", "prazo_entrega", "frete", "valor_frete"].includes(error));
  return (
    <div className={cn("rounded-2xl border bg-card p-4 space-y-3", hasError ? "border-destructive/50" : "border-border/50")}>
      <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Condições</h3>
      <PaymentConditions paymentTerms={paymentTerms} setPaymentTerms={setPaymentTerms} validationErrors={validationErrors} />
      <DeliveryConditions deliveryMode={deliveryMode} setDeliveryMode={setDeliveryMode} deliveryTime={deliveryTime} setDeliveryTime={setDeliveryTime} deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} validationErrors={validationErrors} />
      <ShippingConditions shippingType={shippingType} setShippingType={setShippingType} shippingCost={shippingCost} setShippingCost={setShippingCost} validationErrors={validationErrors} />
    </div>
  );
}
