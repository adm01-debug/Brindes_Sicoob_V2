/**
 * QuoteShareDialog — gera e compartilha exclusivamente o link público da proposta.
 */
import { useEffect, useState } from "react";
import { Copy, Link2, Loader2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuoteApproval, type ApprovalToken } from "@/hooks/useQuoteApproval";
import { normalizePhoneForWhatsApp } from "@/components/products/share/whatsapp";

interface QuoteShareDialogProps {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientEmail?: string | null;
  defaultClientName?: string | null;
  quoteNumber?: string | null;
  total?: number | null;
  clientPhone?: string | null;
}

function publicProposalLink(token: string) {
  return `${window.location.origin}/proposta/${token}`;
}

export function buildQuoteWhatsappUrl({ link, quoteNumber, total, clientPhone }: {
  link: string;
  quoteNumber?: string | null;
  total?: number | null;
  clientPhone?: string | null;
}) {
  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total ?? 0);
  const text = encodeURIComponent(
    `Olá! Segue a proposta comercial *#${quoteNumber || "-"}* no valor de *${amount}*.\n\nVisualize e responda aqui: ${link}`,
  );
  const countryPhone = normalizePhoneForWhatsApp(clientPhone);
  return `https://wa.me/${countryPhone}?text=${text}`;
}

function useShareController(quoteId: string, open: boolean, clientName: string, clientEmail: string) {
  const { generateApprovalLink, getApprovalStatus, copyToClipboard, isLoading, isGenerating } = useQuoteApproval();
  const [token, setToken] = useState<ApprovalToken | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    void getApprovalStatus(quoteId).then((current) => {
      if (!active) return;
      const expiresAt = current?.expires_at ? new Date(current.expires_at).getTime() : Number.POSITIVE_INFINITY;
      const available = current?.status === "active" && expiresAt > Date.now() ? current : null;
      setToken(available);
      setLink(available ? publicProposalLink(available.token) : "");
    });
    return () => { active = false; };
  }, [getApprovalStatus, open, quoteId]);

  const generate = async () => {
    const result = await generateApprovalLink(quoteId, clientName || undefined, clientEmail || undefined);
    if (!result) return;
    setToken(result.token);
    setLink(result.link);
  };

  return {
    token,
    link,
    loading: isLoading,
    generating: isGenerating,
    generate,
    copy: () => copyToClipboard(link),
  };
}

function ClientFields({ quoteId, clientName, clientEmail, onNameChange, onEmailChange }: {
  quoteId: string;
  clientName: string;
  clientEmail: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}) {
  return <>
    <div className="space-y-1">
      <Label htmlFor={`share-client-name-${quoteId}`}>Nome do cliente</Label>
      <Input id={`share-client-name-${quoteId}`} value={clientName} onChange={(event) => onNameChange(event.target.value)} />
    </div>
    <div className="space-y-1">
      <Label htmlFor={`share-client-email-${quoteId}`}>E-mail do cliente</Label>
      <Input id={`share-client-email-${quoteId}`} type="email" value={clientEmail}
        onChange={(event) => onEmailChange(event.target.value)} />
    </div>
  </>;
}

function ShareStatus({ quoteId, controller, onWhatsapp }: {
  quoteId: string;
  controller: ReturnType<typeof useShareController>;
  onWhatsapp: () => void;
}) {
  if (controller.loading && !controller.token) {
    return <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Buscando link atual...
    </div>;
  }
  if (!controller.link) {
    return <Button type="button" onClick={controller.generate} disabled={controller.generating} className="w-full">
      {controller.generating
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : <Link2 className="mr-2 h-4 w-4" />}
      Gerar link público
    </Button>;
  }
  return <div className="space-y-2">
    <Label htmlFor={`share-link-${quoteId}`}>Link público de aprovação</Label>
    <Input id={`share-link-${quoteId}`} value={controller.link} readOnly className="font-mono text-xs" />
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" className="gap-2" onClick={controller.copy}>
        <Copy className="h-4 w-4" /> Copiar link
      </Button>
      <Button type="button" className="gap-2" onClick={onWhatsapp}>
        <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
      </Button>
    </div>
  </div>;
}

export function QuoteShareDialog({
  quoteId,
  open,
  onOpenChange,
  defaultClientEmail,
  defaultClientName,
  quoteNumber,
  total,
  clientPhone,
}: QuoteShareDialogProps) {
  const [clientName, setClientName] = useState(defaultClientName ?? "");
  const [clientEmail, setClientEmail] = useState(defaultClientEmail ?? "");
  const controller = useShareController(quoteId, open, clientName, clientEmail);
  const shareByWhatsapp = () => {
    if (!controller.link) return;
    window.open(
      buildQuoteWhatsappUrl({ link: controller.link, quoteNumber, total, clientPhone }),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(event) => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Compartilhar proposta
          </DialogTitle>
          <DialogDescription>Gere um link público para o cliente visualizar e responder sem fazer login.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ClientFields quoteId={quoteId} clientName={clientName} clientEmail={clientEmail}
            onNameChange={setClientName} onEmailChange={setClientEmail} />
          <ShareStatus quoteId={quoteId} controller={controller} onWhatsapp={shareByWhatsapp} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
