import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays } from "date-fns";

interface ValidityPickerProps {
  validityDays: string;
  setValidityDays: (days: string) => void;
  setValidUntil: (date: string) => void;
}

export function ValidityPicker({
  validityDays,
  setValidityDays,
  setValidUntil
}: ValidityPickerProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
      <h3 className="font-display font-semibold text-sm flex items-center gap-2">
        <span className="text-primary">📅</span>Validade | Proposta
      </h3>
      <Select 
        value={validityDays} 
        onValueChange={(val) => { 
          setValidityDays(val); 
          setValidUntil(format(addDays(new Date(), parseInt(val)), "yyyy-MM-dd")); 
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 dia</SelectItem>
          <SelectItem value="3">3 dias</SelectItem>
          <SelectItem value="7">7 dias</SelectItem>
          <SelectItem value="15">15 dias</SelectItem>
          <SelectItem value="30">30 dias</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}