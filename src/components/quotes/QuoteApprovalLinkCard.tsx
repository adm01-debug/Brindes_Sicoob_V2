import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Eye,
  Clock,
  XCircle,
  CheckCircle,
  RefreshCw,
  Ban,
} from "lucide-react";
import { useQuoteApproval, type ApprovalToken } from "@/hooks/useQuoteApproval";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface QuoteApprovalLinkCardProps {
  quoteId: string;
  clientName?: string;
  clientEmail?: string;
}

function ApprovalStatusBadge({ token }: { token: ApprovalToken | null }) {
  if (!token) return null;
  if (token.response === 'approved') return <Badge className="bg-success/10 text-success border-success/30 gap-1"><CheckCircle className="h-3 w-3" /> Aprovado</Badge>;
  if (token.response === 'rejected') return <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
  if (token.status === 'revoked') return <Badge variant="secondary" className="gap-1"><Ban className="h-3 w-3" /> Revogado</Badge>;
  if (token.viewed_at) return <Badge className="bg-info/10 text-info border-info/30 gap-1"><Eye className="h-3 w-3" /> Visualizado</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Aguardando</Badge>;
}

function ApprovalStatusInfo({ token }: { token: ApprovalToken }) {
  return <div className="text-xs text-muted-foreground space-y-1">
    {token.viewed_at && <p className="flex items-center gap-1"><Eye className="h-3 w-3" />Visualizado em{' '}
      {format(new Date(token.viewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
    {token.responded_at && <p className="flex items-center gap-1">{token.response === 'approved'
      ? <CheckCircle className="h-3 w-3 text-success" /> : <XCircle className="h-3 w-3 text-destructive" />}
      {token.response === 'approved' ? 'Aprovado' : 'Rejeitado'} em{' '}
      {format(new Date(token.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
    {token.response_notes && <p className="italic mt-1">"{token.response_notes}"</p>}
    {token.expires_at && !token.responded_at && <p className="flex items-center gap-1"><Clock className="h-3 w-3" />
      Expira em {format(new Date(token.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</p>}
  </div>;
}

function ActiveApprovalLink({ token, link, copied, onCopy, onRegenerate, onRevoke }: {
  token: ApprovalToken; link: string; copied: boolean; onCopy: () => void; onRegenerate: () => void; onRevoke: () => void;
}) {
  return <><div className="flex gap-2"><Input readOnly value={link} className="text-xs font-mono bg-muted/30" />
    <Button size="icon" aria-label="Confirmar" variant="outline" onClick={onCopy} className="shrink-0">
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}</Button>
    <Button size="icon" aria-label="Abrir link" variant="outline" className="shrink-0" onClick={() => window.open(link, '_blank')}>
      <ExternalLink className="h-4 w-4" /></Button></div>
    <ApprovalStatusInfo token={token} />
    {!token.responded_at && <div className="flex gap-2 pt-1"><Button size="sm" variant="outline" className="text-xs gap-1" onClick={onRegenerate}>
      <RefreshCw className="h-3 w-3" /> Regenerar</Button><Button size="sm" variant="ghost"
        className="text-xs gap-1 text-destructive hover:text-destructive" onClick={onRevoke}><Ban className="h-3 w-3" /> Revogar</Button></div>}
  </>;
}

function ApprovalLinkContent({ token, link, copied, loading, onCopy, onRegenerate, onRevoke, onGenerate }: {
  token: ApprovalToken | null; link: string; copied: boolean; loading: boolean; onCopy: () => void;
  onRegenerate: () => void; onRevoke: () => void; onGenerate: () => void;
}) {
  if (token && token.status !== 'revoked') return <ActiveApprovalLink token={token} link={link} copied={copied}
    onCopy={onCopy} onRegenerate={onRegenerate} onRevoke={onRevoke} />;
  return <Button onClick={onGenerate} disabled={loading} className="w-full gap-2">
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}Gerar Link de Aprovação</Button>;
}

function useApprovalLinkController({ quoteId, clientName, clientEmail }: QuoteApprovalLinkCardProps) {
  const { generateApprovalLink, getApprovalStatus, revokeToken, isLoading } = useQuoteApproval();
  const [token, setToken] = useState<ApprovalToken | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);
  const assignResult = (result: { token: unknown; link: string } | null) => {
    if (!result) return;
    setToken(result.token as ApprovalToken);
    setLink(result.link);
  };
  useEffect(() => {
    const check = async () => {
      setChecking(true);
      const current = await getApprovalStatus(quoteId);
      if (current) { setToken(current); setLink(`${window.location.origin}/proposta/${current.token}`); }
      setChecking(false);
    };
    void check();
  }, [getApprovalStatus, quoteId]);
  const generate = async () => assignResult(await generateApprovalLink(quoteId, clientName, clientEmail));
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); toast.success("Link copiado!"); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error("Erro ao copiar"); }
  };
  const revoke = async () => {
    if (token && await revokeToken(token.id)) { setToken(null); setLink(""); }
  };
  const regenerate = async () => {
    if (token) await revokeToken(token.id);
    setToken(null); setLink("");
    assignResult(await generateApprovalLink(quoteId, clientName, clientEmail));
  };
  return { token, link, copied, checking, loading: isLoading, generate, copy, revoke, regenerate };
}

export function QuoteApprovalLinkCard({ quoteId, clientName, clientEmail }: QuoteApprovalLinkCardProps) {
  const controller = useApprovalLinkController({ quoteId, clientName, clientEmail });

  if (controller.checking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Link de Aprovação
          </CardTitle>
          <ApprovalStatusBadge token={controller.token} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ApprovalLinkContent token={controller.token} link={controller.link} copied={controller.copied} loading={controller.loading}
          onCopy={controller.copy} onRegenerate={controller.regenerate} onRevoke={controller.revoke} onGenerate={controller.generate} />
      </CardContent>
    </Card>
  );
}
