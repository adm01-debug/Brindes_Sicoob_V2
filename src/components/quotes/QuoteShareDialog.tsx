/**
 * QuoteShareDialog — modal para gerar e copiar link público de aprovação do orçamento.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuoteShareDialogProps {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientEmail?: string;
  defaultClientName?: string;
}

function useApprovalLink(quoteId: string, clientName: string, clientEmail: string) {
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const link = token ? `${window.location.origin}/orcamento/aprovar/${token}` : null;
  const generate = async () => {
    setIsGenerating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("quote_approval_tokens").insert({
        quote_id: quoteId, seller_id: userData.user.id, client_name: clientName || null, client_email: clientEmail || null,
      }).select("token").single();
      if (error) throw error;
      setToken(data.token);
      toast.success("Link gerado!");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao gerar link"); }
    finally { setIsGenerating(false); }
  };
  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  };
  return { link, isGenerating, generate, copy };
}

export function QuoteShareDialog({ quoteId, open, onOpenChange, defaultClientEmail, defaultClientName }: QuoteShareDialogProps) {
  const [clientName, setClientName] = useState(defaultClientName ?? "");
  const [clientEmail, setClientEmail] = useState(defaultClientEmail ?? "");
  const { link, isGenerating, generate, copy } = useApprovalLink(quoteId, clientName, clientEmail);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Compartilhar orçamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome do cliente</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>E-mail do cliente</Label>
            <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
          </div>
          {link ? (
            <div className="space-y-1">
              <Label>Link de aprovação</Label>
              <div className="flex gap-2">
                <Input value={link} readOnly className="font-mono text-xs" />
                <Button onClick={copy} size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={generate} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Gerar link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
