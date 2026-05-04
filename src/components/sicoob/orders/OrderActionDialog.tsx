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
}: OrderActionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea 
            placeholder={placeholder} 
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="min-h-[120px] focus-visible:ring-sicoob-green border-muted-foreground/20"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
