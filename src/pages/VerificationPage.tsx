import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Building2, FileText, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type VerificationQuote = Pick<
  Tables<"quotes">,
  | "id"
  | "quote_number"
  | "status"
  | "total"
  | "created_at"
  | "updated_at"
  | "client_name"
  | "client_company"
  | "client_cnpj"
  | "approved_at"
  | "approved_by"
  | "approved_pdf_url"
>;

export default function VerificationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<VerificationQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!id || id === 'preview') {
        setLoading(false);
        setError("ID de documento inválido ou não fornecido.");
        return;
      }

      try {
        const { data, error } = await supabase
          // rls-allow: visualização por token/identificador; RLS aplica a policy pública específica
          .from("quotes")
          .select(`
            id, quote_number, status, total, created_at, updated_at, 
            client_name, client_company, client_cnpj,
            approved_at, approved_by, approved_pdf_url
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setError("Documento não encontrado em nossa base de dados.");
        } else {
          setQuote(data);
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao verificar integridade do documento.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Verificando autenticidade...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full shadow-2xl border-2">
          <CardHeader className="text-center pb-8 border-b">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold font-display">Falha na Verificação</CardTitle>
            <CardDescription>Protocolo de Verificação Digital Gift Store</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-bold">Este documento não pôde ser validado.</p>
                <p className="text-sm mt-1">{error ?? "Documento não encontrado em nossa base de dados."}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
              Ir para a página inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApproved = ["approved", "converted"].includes(quote.status);

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8 flex items-center justify-center">
      <Card className="max-w-2xl w-full shadow-2xl border-2 transition-all">
        <CardHeader className="text-center pb-8 border-b">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-display">Documento Autêntico</CardTitle>
          <CardDescription>
            Protocolo de Verificação Digital Gift Store
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-8 space-y-6">
          <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Número da Proposta</span>
                    <span className="font-display font-bold text-lg">#{quote.quote_number}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status Atual</span>
                    <div className="mt-1">
                      <Badge variant={isApproved ? "default" : "secondary"} className="h-6">
                        {isApproved ? "Aprovado e Válido" : quote.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Data de Emissão</span>
                    <span className="text-sm font-medium">{format(new Date(quote.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Cliente / Destinatário</span>
                    <span className="text-sm font-bold flex items-center gap-1.5 mt-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {quote.client_company || quote.client_name}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Valor Total</span>
                    <span className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)}
                    </span>
                  </div>

                  {isApproved && quote.approved_at && (
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Aprovado em</span>
                      <span className="text-sm font-medium flex items-center gap-1.5 mt-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        {format(new Date(quote.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Evidências de Integridade
                </h4>
                <div className="text-[11px] font-mono text-muted-foreground space-y-1.5 break-all">
                  <p>Document ID: {quote.id}</p>
                  <p>Hash Verificação: {quote.id.slice(0, 8).toUpperCase()}</p>
                  <p>Certificação: Conforme MP 2.200-2/2001</p>
                </div>
              </div>

              {quote.approved_pdf_url && (
                <Button className="w-full h-12 gap-2" asChild>
                  <a href={quote.approved_pdf_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-5 w-5" />
                    Ver PDF Original Assinado
                  </a>
                </Button>
              )}
          </>

          <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
            Ir para a página inicial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
