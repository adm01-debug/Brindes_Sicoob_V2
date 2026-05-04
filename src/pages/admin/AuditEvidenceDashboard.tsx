import React, { useState } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileCode, Shield, CheckCircle2, AlertTriangle, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const EVIDENCES = [
  {
    feature: "Isolamento Multi-tenant (RLS)",
    category: "Segurança",
    path: "supabase/migrations/20250103_02_rls_organizations.sql",
    snippet: 'CREATE POLICY "org_members_view_quotes" ON public.quotes FOR SELECT USING (public.user_is_org_member(organization_id));',
    status: "Achado",
    priority: "P0",
    acceptance: "Zero acesso cross-org em testes anon/unauthorized"
  },
  {
    feature: "Precisão Financeira 4 Casas",
    category: "Integridade",
    path: "supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql",
    snippet: "unit_price numeric(14,4)",
    status: "Achado",
    priority: "P0",
    acceptance: "Cálculos batem com 4 decimais em orçamentos > 1MM"
  },
  {
    feature: "Fallback de IA (Redundância)",
    category: "Resiliência",
    path: "supabase/functions/_shared/ai-usage.ts",
    snippet: "export async function callAiWithFallback(...)",
    status: "Achado",
    priority: "P1",
    acceptance: "Switch automático em < 5s após erro 5xx"
  },
  {
    feature: "Blockchain Audit Trail",
    category: "Infra",
    path: "roadmap/ledger-integration",
    snippet: "Implementação de Ledger externa para imutabilidade total.",
    status: "Pendente",
    priority: "P3",
    acceptance: "Hash SHA256 do log assinado em rede externa"
  }
];

export default function AuditEvidenceDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleExpand = (feature: string) => {
    setExpandedRows(prev => prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]);
  };

  const filteredEvidences = EVIDENCES.filter(ev => 
    ev.feature.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <PageSEO title="Dashboard de Evidências" description="Rastreabilidade total para auditoria." path="/admin/auditoria/evidencias" noIndex />
      
      <div className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portal de Evidências Técnicas</h1>
            <p className="text-muted-foreground mt-1">Status de conformidade enterprise v10/10</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filtrar por módulo ou feature..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total Evidências</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{EVIDENCES.length}</div></CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Achados Validados</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-green-600">{EVIDENCES.filter(e => e.status === 'Achado').length}</div></CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Pendentes</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-yellow-600">{EVIDENCES.filter(e => e.status === 'Pendente').length}</div></CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Riscos Críticos</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-red-600">0</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Funcionalidade</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvidences.map((ev) => (
                  <React.Fragment key={ev.feature}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(ev.feature)}
                    >
                      <TableCell>
                        {expandedRows.includes(ev.feature) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{ev.feature}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{ev.category}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={ev.priority === 'P0' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {ev.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={ev.status === 'Achado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {ev.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedRows.includes(ev.feature) && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-xs font-bold uppercase text-muted-foreground">Critério de Aceite</p>
                              <p className="text-sm">{ev.acceptance}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-bold uppercase text-muted-foreground">Evidência Técnica</p>
                              <div className="flex items-center gap-2 text-xs font-mono text-primary mb-1">
                                <FileCode className="h-3.5 w-3.5" /> {ev.path}
                              </div>
                              <code className="text-[10px] bg-background border rounded p-2 block overflow-x-auto whitespace-pre-wrap">
                                {ev.snippet}
                              </code>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

