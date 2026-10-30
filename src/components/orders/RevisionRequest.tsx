import { type ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, RotateCcw } from "lucide-react";
import { QuickReplySelector } from "./QuickReplySelector";

interface Props {
  orderId: string;
  onSend: (notes: string) => Promise<void>;
  trigger?: ReactNode;
}

function RevisionForm({ notes, sending, onNotesChange, onCancel, onSend }: {
  notes: string;
  sending: boolean;
  onNotesChange: (notes: string) => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  return <><div className="space-y-4 py-4">
    <Textarea placeholder="Descreva as alterações necessárias..." className="min-h-[120px]"
      value={notes} onChange={(event) => onNotesChange(event.target.value)} />
    <QuickReplySelector onSelect={(reply) => onNotesChange(notes ? `${notes} ${reply}` : reply)} />
  </div><DialogFooter>
    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
    <Button onClick={onSend} disabled={sending || !notes.trim()}>{sending ? "Enviando..." : "Enviar Solicitação"}</Button>
  </DialogFooter></>;
}

export function RevisionRequest({ onSend, trigger }: Props) {
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
        
        <RevisionForm notes={notes} sending={isSending} onNotesChange={setNotes}
          onCancel={() => setIsOpen(false)} onSend={handleSend} />
      </DialogContent>
    </Dialog>
  );
}
