import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, RotateCcw } from "lucide-react";
import { QuickReplySelector } from "./QuickReplySelector";

interface Props {
  orderId: string;
  onSend: (notes: string) => Promise<void>;
  trigger?: React.ReactNode;
}

export function RevisionRequest({ orderId, onSend, trigger }: Props) {
  const [notes, setNotes] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!notes.trim()) return;
    setIsSending(true);
    try {
      await onSend(notes);
      setIsOpen(false);
      setNotes("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Solicitar Revisão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Solicitar Revisão do Pedido
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea 
            placeholder="Descreva as alterações necessárias..." 
            className="min-h-[120px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          
          <QuickReplySelector onSelect={(reply) => setNotes(prev => prev ? `${prev} ${reply}` : reply)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSend} disabled={isSending || !notes.trim()}>
            {isSending ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
