import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SicoobStatusBadge } from "@/components/sicoob/SicoobStatusBadge";
import { SicoobFulfillmentStatus, SICOOB_STATUS_CONFIG } from "@/lib/sicoob-status-config";
import { Palette, CheckCircle2, AlertTriangle, Info, Trophy, Layout, Download, Table as TableIcon, Hash } from "lucide-react";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function ColorDocumentationPage() {
  const statuses: SicoobFulfillmentStatus[] = [
    "in_production", "in_separation", "in_transit", "delivered", "completed", "cancelled"
  ];

  return (
    <MainLayout>
      <div className="container max-w-6xl py-10 space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Palette className="h-10 w-10 text-brand" />
            Sicoob Design System — Cores
          </h1>
          <p className="text-xl text-muted-foreground">
            Tokens oficiais baseados na peça Sicoob 2024 (Poupança Premiada).
          </p>
        </div>

        {/* 1. Core Tokens */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Layout className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Cores de Marca</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ColorCard 
              name="Brand (Teal 2024)" 
              token="--brand" 
              hex="#00AE9D" 
              className="bg-brand text-brand-foreground"
              description="Cor de ação, CTAs, energia moderna."
            />
            <ColorCard 
              name="Primary (Institucional)" 
              token="--primary" 
              hex="#003641" 
              className="bg-primary text-primary-foreground"
              description="Âncora, logos, headers, peso bancário."
            />
            <ColorCard 
              name="Secondary (Lima)" 
              token="--secondary" 
              hex="#7DB61C" 
              className="bg-secondary text-secondary-foreground"
              description="Acento, badges pontuais."
            />
            <ColorCard 
              name="Accent (Amarelo)" 
              token="--accent" 
              hex="#FFBB00" 
              className="bg-accent text-accent-foreground"
              description="Destaque, moedas, urgência."
            />
             <ColorCard 
              name="Reward (Roxo)" 
              token="--reward" 
              hex="#5C2D91" 
              className="bg-reward text-reward-foreground"
              description="Prêmios, Coopera, cupons."
            />
          </div>
        </section>

        {/* 2. Semantic Components */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h2 className="text-2xl font-semibold">Componentes e Estados</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Botões e CTAs</CardTitle>
                <CardDescription>Uso correto da hierarquia de cores.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button variant="default">Botão Brand</Button>
                <Button variant="sicoob">Botão Institucional</Button>
                <Button variant="premium">Botão Premium</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges Sicoob Workflow</CardTitle>
                <CardDescription>Mapeamento automático de fulfillment_status.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {statuses.map(s => (
                  <SicoobStatusBadge key={s} status={s} />
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 3. Feedback States */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-2xl font-semibold">Feedback e Semântica</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-success/30 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-success flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-success/80">Operação realizada. Verde harmonizado (155 60% 38%).</p>
              </CardContent>
            </Card>
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Alerta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-warning/80">Revisão necessária. Amarelo Sicoob (44 100% 50%).</p>
              </CardContent>
            </Card>
            <Card className="border-info/30 bg-info/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-info flex items-center gap-2">
                  <Info className="h-4 w-4" /> Informativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-info/80">Dados contextuais. Azul harmonizado.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

function ColorCard({ name, token, hex, className, description }: { 
  name: string; 
  token: string; 
  hex: string; 
  className: string;
  description: string;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className={`h-24 flex items-end p-3 ${className}`}>
        <span className="font-mono text-[10px] opacity-70">{hex}</span>
      </div>
      <CardContent className="p-4 space-y-1">
        <h3 className="font-bold text-sm">{name}</h3>
        <p className="font-mono text-[10px] text-muted-foreground">{token}</p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
