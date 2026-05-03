import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, FileSpreadsheet, FileBarChart, ArrowRight, Download, CalendarIcon, Wallet, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const REPORTS = [
  { title: "Consumo por Ponto de Atendimento", desc: "Detalhamento de gastos e orçamentos por agência (PA).", icon: FileBarChart, type: "PDF / Excel" },
  { title: "Relatório de NF e Pagamentos", desc: "Controle de notas fiscais emitidas e status de liquidação.", icon: FileSpreadsheet, type: "Excel" },
  { title: "Auditoria de Aprovações SICOOB", desc: "Log completo de quem aprovou ou rejeitou cada pedido.", icon: FileText, type: "PDF" },
  { title: "Performance de Logística", desc: "Métricas de prazos de entrega e ocorrências de transporte.", icon: FileBarChart, type: "PDF" },
];

export default function SicoobReportsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Relatórios SICOOB</h1>
          <p className="text-muted-foreground italic">Exportação de dados para auditoria, controle financeiro e conformidade.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {REPORTS.map((report, idx) => (
            <Card key={idx} className="border-[1.5px] hover:border-sicoob-green/50 transition-colors group">
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex gap-4">
                  <div className="p-3 rounded-xl bg-sicoob-green/10 text-sicoob-green group-hover:bg-sicoob-green group-hover:text-white transition-colors">
                    <report.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-sicoob-green-dark">{report.title}</CardTitle>
                    <CardDescription className="mt-1 italic">{report.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formato: {report.type}</span>
                <Button variant="ghost" className="gap-2 text-sicoob-green hover:text-sicoob-green-dark">
                  Gerar <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
