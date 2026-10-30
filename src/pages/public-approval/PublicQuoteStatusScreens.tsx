/**
 * Status screens for PublicQuoteApprovalPage — loading, expired, already responded, error, submitted.
 */
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle, XCircle, Loader2, AlertTriangle, FileText, Sparkles, ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import type { AlreadyRespondedData, SignatureReceipt } from "./usePublicQuoteApproval";

function formatDocMask(digits?: string): string {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return d;
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <PageSEO title="Aprovação de Orçamento" description="Revise e aprove seu orçamento de brindes promocionais." noIndex />
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Carregando proposta...</p>
      </div>
    </div>
  );
}

export function ExpiredScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <AlertTriangle className="h-16 w-16 text-warning mx-auto" />
          <h2 className="font-display text-xl font-bold">Link expirado</h2>
          <p className="text-muted-foreground">
            Este link de aprovação expirou. Entre em contato com o vendedor para receber um novo link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AlreadyRespondedScreen({ data }: { data: AlreadyRespondedData }) {
  const isApproved = data.response === "approved";
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          {isApproved ? (
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
          ) : (
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
          )}
          <h2 className="font-display text-xl font-bold">
            Proposta {isApproved ? "aprovada" : "recusada"}
          </h2>
          <p className="text-muted-foreground">
            Esta proposta foi {isApproved ? "aprovada" : "recusada"} em{" "}
            {format(new Date(data.responded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
          </p>
          {data.response_notes && (
            <p className="text-sm text-muted-foreground italic">"{data.response_notes}"</p>
          )}
          {isApproved && data.signer_name && (
            <div className="text-left text-xs bg-muted/50 border rounded-md p-3 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Assinatura eletrônica
              </div>
              <p><span className="text-muted-foreground">Assinado por:</span> {data.signer_name}</p>
              {data.signer_document && <p><span className="text-muted-foreground">Documento:</span> {formatDocMask(data.signer_document)}</p>}
              {data.signature_hash && <p className="break-all"><span className="text-muted-foreground">Hash:</span> <code className="text-[10px]">{data.signature_hash.slice(0, 32)}…</code></p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorScreen({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="font-display text-xl font-bold">Proposta não encontrada</h2>
          <p className="text-muted-foreground">{error || "Verifique o link e tente novamente."}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubmittedScreen({ response, receipt }: { response: string; receipt?: SignatureReceipt | null }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          {response === "approved" ? (
            <>
              <div className="relative mx-auto w-20 h-20">
                <CheckCircle className="h-20 w-20 text-success" />
                <Sparkles className="h-6 w-6 text-warning absolute -top-1 -right-1" />
              </div>
              <h2 className="font-display text-2xl font-bold text-success">Proposta aprovada!</h2>
              <p className="text-muted-foreground">
                Obrigado! O vendedor foi notificado e entrará em contato em breve.
              </p>
              {receipt && (
                <div className="text-left text-xs bg-success/5 border border-success/30 rounded-md p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" /> Comprovante de assinatura eletrônica
                  </div>
                  <p><span className="text-muted-foreground">Assinado por:</span> <strong>{receipt.signer_name}</strong></p>
                  <p><span className="text-muted-foreground">Documento:</span> {formatDocMask(receipt.signer_document)}</p>
                  <p><span className="text-muted-foreground">Data/hora:</span> {format(new Date(receipt.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                  <p><span className="text-muted-foreground">IP:</span> <code className="text-[10px]">{receipt.signer_ip}</code></p>
                  <p className="break-all"><span className="text-muted-foreground">Hash de integridade:</span><br/><code className="text-[10px]">{receipt.signature_hash}</code></p>
                  <p className="text-[10px] text-muted-foreground pt-1 border-t mt-1.5">
                    Este aceite foi registrado eletronicamente conforme o art. 10, §2º da MP 2.200-2/2001 e tem validade jurídica.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <XCircle className="h-20 w-20 text-destructive mx-auto" />
              <h2 className="font-display text-2xl font-bold">Proposta recusada</h2>
              <p className="text-muted-foreground">
                Sua resposta foi registrada. O vendedor foi notificado.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
