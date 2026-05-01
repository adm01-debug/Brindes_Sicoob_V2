/**
 * PublicDossierPage — página pública read-only do dossiê BI.
 * Validada via token HMAC pela edge function `bi-share-dossier`.
 * Renderiza versão simplificada do dossiê (Health + KPIs + sazonalidade) sem auth.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, ShieldCheck, AlertCircle, Clock } from "lucide-react";
import { ClientHealthHero } from "@/components/bi/ClientHealthHero";
import { ClientOverview360 } from "@/components/bi/ClientOverview360";
import { ClientCategoryRadar } from "@/components/bi/ClientCategoryRadar";
import { ClientSeasonalityHeatmap } from "@/components/bi/ClientSeasonalityHeatmap";
import { ClientVsIndustryComparison } from "@/components/bi/ClientVsIndustryComparison";
import { PageSEO } from "@/components/seo/PageSEO";

interface TokenPayload {
  clientId: string;
  clientName: string;
  ramoAtividade: string | null;
  sellerId: string;
  iat: number;
  exp: number;
}

export default function PublicDossierPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "valid"; payload: TokenPayload }
    | { status: "invalid"; error: string }
  >({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", error: "Token ausente" });
      return;
    }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/bi-share-dossier?token=${encodeURIComponent(token)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid && data.payload) {
          setState({ status: "valid", payload: data.payload });
        } else {
          setState({ status: "invalid", error: data.error ?? "Link inválido ou expirado" });
        }
      })
      .catch((err) => setState({ status: "invalid", error: String(err) }));
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (state.status === "invalid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-[1.5px]">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="font-display font-bold text-lg">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground">{state.error}</p>
            <p className="text-xs text-muted-foreground">
              Solicite um novo link ao remetente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { payload } = state;
  const expiresAt = new Date(payload.exp * 1000);

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title={`Dossiê · ${payload.clientName}`}
        description="Dossiê BI compartilhado (read-only)."
        path={`/dossie/${token}`}
        noIndex
      />
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Dossiê · {payload.clientName}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" />
                Link assinado · read-only
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Expira em {expiresAt.toLocaleDateString("pt-BR")}
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <ClientHealthHero
          clientId={payload.clientId}
          ramoAtividade={payload.ramoAtividade}
          clientName={payload.clientName}
        />
        <ClientOverview360 clientId={payload.clientId} />
        <ClientCategoryRadar
          clientId={payload.clientId}
          ramoAtividade={payload.ramoAtividade}
          clientName={payload.clientName}
        />
        <ClientVsIndustryComparison clientId={payload.clientId} ramoAtividade={payload.ramoAtividade} />
        <ClientSeasonalityHeatmap clientId={payload.clientId} ramoAtividade={payload.ramoAtividade} />
      </main>

      <footer className="border-t bg-card mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          Dossiê gerado por Sicoob · Portal de Compras
        </div>
      </footer>
    </div>
  );
}
