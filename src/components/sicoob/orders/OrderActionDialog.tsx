import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Fingerprint, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { QuickReplySelector } from "@/components/orders/QuickReplySelector";

interface OrderActionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder?: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  value: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  requireSignature?: boolean;
}

export const OrderActionDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  placeholder,
  confirmLabel,
  confirmVariant = "default",
  value,
  onValueChange,
  onConfirm,
  confirmDisabled = false,
  requireSignature = true,
}: OrderActionDialogProps) => {
  const [isSigned, setIsSigned] = useState(false);

  const handleConfirm = () => {
    if (requireSignature && !isSigned) return;
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border/40">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-sicoob-green/10">
              <ShieldCheck className="h-5 w-5 text-sicoob-green" />
            </div>
            <DialogTitle className="text-xl font-display font-bold text-sicoob-green-dark">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Justificativa Operacional (BPMN)</label>
            <Textarea 
              placeholder={placeholder} 
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className="min-h-[120px] focus-visible:ring-sicoob-green/30 border-border/60 bg-muted/5 rounded-xl resize-none text-sm"
            />
          </div>

          {requireSignature && (
            <div 
              className={cn(
                "p-4 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group relative overflow-hidden",
                isSigned 
                  ? "bg-sicoob-green/5 border-sicoob-green/40 ring-4 ring-sicoob-green/5" 
                  : "bg-muted/10 border-border/60 hover:border-sicoob-green/30 hover:bg-muted/20"
              )}
              onClick={() => setIsSigned(!isSigned)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  isSigned ? "bg-sicoob-green text-white" : "bg-muted text-muted-foreground"
                )}>
                  {isSigned ? <CheckCircle2 className="h-4 w-4" /> : <Fingerprint className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Assinatura Digital Requerida</p>
                  <p className="text-[10px] text-muted-foreground">Clique para assinar com suas credenciais Sicoob</p>
                </div>
                {isSigned && (
                  <div className="ml-auto flex flex-col items-end">
                    <span className="text-[8px] font-mono font-bold text-sicoob-green/60">TRUSTED_TOKEN</span>
                    <span className="text-[8px] font-mono text-sicoob-green/40">AUTH_SUCCESS</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-xs uppercase tracking-wider">
            Cancelar
          </Button>
          <Button 
            variant={confirmVariant} 
            onClick={handleConfirm} 
            disabled={confirmDisabled || (requireSignature && !isSigned)}
            className={cn(
              "rounded-xl font-bold text-xs uppercase tracking-wider px-6 h-10",
              confirmVariant === 'default' && "bg-sicoob-green hover:bg-sicoob-green-dark text-white"
            )}
          >
            {isSigned && <Lock className="h-3.5 w-3.5 mr-2" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
