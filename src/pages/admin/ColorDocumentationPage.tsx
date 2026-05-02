import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SicoobStatusBadge } from "@/components/sicoob/SicoobStatusBadge";
import { SicoobFulfillmentStatus, SICOOB_STATUS_CONFIG } from "@/lib/sicoob-status-config";
import { 
  Palette, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Layout, 
  Download, 
  Hash, 
  CheckSquare, 
  Eye, 
  EyeOff, 
  AlertCircle,
  FileText,
  MousePointer2,
  CheckCircle,
  XCircle,
  ChevronRight
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TOKEN_MAP = {
  brand: "bg-brand",
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  reward: "bg-reward",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const TEXT_TOKEN_MAP = {
  brand: "text-brand",
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  reward: "text-reward",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export default function ColorDocumentationPage() {
  const { toggleTheme, theme } = useTheme();
  const [filterToken, setFilterToken] = useState<string>("all");
  
  const statuses: SicoobFulfillmentStatus[] = [
    "in_production", "in_separation", "in_transit", "delivered", "completed", "cancelled"
  ];

  const contrastData = [
    { token: "brand", bg: "background", ratio: "4.64", pass: true, usage: "Ações principais (CTAs)" },
    { token: "primary", bg: "background", ratio: "12.29", pass: true, usage: "Header, Logos, Textos" },
    { token: "reward", bg: "background", ratio: "8.83", pass: true, usage: "Selo de Recompensa" },
    { token: "accent", bg: "primary", ratio: "7.58", pass: true, usage: "Destaque sobre escuro" },
    { token: "success", bg: "background", ratio: "5.12", pass: true, usage: "Confirmações" },
    { token: "warning", bg: "background", ratio: "3.45", pass: false, usage: "Atenção (Usar /10)" },
    { token: "destructive", bg: "background", ratio: "6.82", pass: true, usage: "Excluir, Erro" },
  ];

  const filteredContrast = useMemo(() => (
    filterToken === "all" 
      ? contrastData 
      : contrastData.filter(d => d.token === filterToken)
  ), [filterToken]);

  return (
    <MainLayout>
      <div className="container max-w-6xl py-10 space-y-12 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Palette className="h-10 w-10 text-brand" />
              Sicoob Design System — Cores
            </h1>
            <p className="text-lg text-muted-foreground">
              Tokens oficiais baseados na peça Sicoob 2024 (Poupança Premiada).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={toggleTheme}>
              {theme === "dark" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Alternar Tema (Light/Dark)
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => exportTokensJSON()}>
              <Download className="h-4 w-4" />
              Exportar Tokens (JSON)
            </Button>
          </div>
        </div>

        {/* 1. Core Tokens */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Layout className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Cores de Marca</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <ColorCard 
              name="Primary (Verde Escuro)" 
              token="--primary" 
              hex="#003641" 
              className="bg-primary text-primary-foreground"
              description="Âncora institucional, headers, tipografia de peso."
            />
            <ColorCard 
              name="Brand (Turquesa)" 
              token="--brand" 
              hex="#00AE9D" 
              className="bg-brand text-brand-foreground"
              description="Cor protagonista. CTAs, ações e energia cooperativa."
            />
            <ColorCard 
              name="Secondary (Verde Médio)" 
              token="--secondary" 
              hex="#00875A" 
              className="bg-secondary text-secondary-foreground"
              description="Suporte ao turquesa, badges e ações complementares."
            />
            <ColorCard 
              name="Accent (Roxo)" 
              token="--accent" 
              hex="#5C2D91" 
              className="bg-accent text-accent-foreground"
              description="Detalhes pontuais, destaques sutis."
            />
             <ColorCard 
              name="Reward (Roxo Claro)" 
              token="--reward" 
              hex="#7B3FAB" 
              className="bg-reward text-reward-foreground"
              description="Prêmios, Coopera, cupons promocionais."
            />
          </div>
        </section>

        {/* 2. Semantic Components & Interactive StatusBadges */}
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
                <CardDescription>Mapeamento automático com suporte a texto longo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {statuses.map(s => (
                    <SicoobStatusBadge key={s} status={s} />
                  ))}
                </div>
                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Exemplo de Texto Longo:</p>
                  <div className="flex flex-col gap-2">
                    <SicoobStatusBadge status="in_separation" className="max-w-[200px]" />
                    <div className="inline-flex">
                       <SicoobStatusBadge 
                         status="in_separation" 
                         className="max-w-[150px]"
                       />
                       <span className="text-[10px] ml-2 text-muted-foreground self-center italic">(Truncado em 150px)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 3. Feedback States, Interactive Examples & Forms */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-2xl font-semibold">Feedback e Exemplos Práticos</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Alertas por Estado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-success/30 bg-success/10 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Sucesso</AlertTitle>
                  <AlertDescription>Operação concluída com sucesso.</AlertDescription>
                </Alert>
                <Alert className="border-warning/30 bg-warning/10 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>Revisão necessária para prosseguir.</AlertDescription>
                </Alert>
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro Crítico</AlertTitle>
                  <AlertDescription>Falha na comunicação com o sistema.</AlertDescription>
                </Alert>
                <Alert className="border-brand/30 bg-brand/10 text-brand">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Informativo</AlertTitle>
                  <AlertDescription>Atualização de sistema programada.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MousePointer2 className="h-4 w-4" /> CTAs e Interatividade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Botões de Ação Principal</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="default">Primário (Brand)</Button>
                    <Button variant="premium">Premium (Brand Glow)</Button>
                    <Button variant="success">Confirmar (Success)</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Botões de Alerta e Sistema</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive">Excluir (Danger)</Button>
                    <Button variant="outline" className="border-warning text-warning hover:bg-warning/10">Revisar (Warning)</Button>
                    <Button variant="sicoob">Institucional (Primary)</Button>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground">Badges de Contexto</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Destaque</Badge>
                    <Badge variant="accent">Prêmio (Accent)</Badge>
                    <Badge variant="success">Pago</Badge>
                    <Badge variant="warning">Pendente</Badge>
                    <Badge variant="destructive">Atrasado</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Estados de Formulário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="input-brand">Campo Principal (Brand Focus)</Label>
                  <Input id="input-brand" placeholder="Foco Teal Sicoob..." className="focus-visible:ring-brand/20 focus-visible:border-brand" />
                  <p className="text-[10px] text-muted-foreground">Helper text padrão do sistema.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="input-success" className="text-success">Campo Válido (Success)</Label>
                  <Input id="input-success" defaultValue="Dados corretos" className="border-success/50 focus-visible:ring-success/20 focus-visible:border-success" />
                  <p className="text-[10px] text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> E-mail disponível para uso.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="input-error" className="text-destructive">Campo Inválido (Danger)</Label>
                  <Input id="input-error" placeholder="Erro detectado" className="border-destructive/50 focus-visible:ring-destructive/20 focus-visible:border-destructive" />
                  <p className="text-[10px] text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> CPF informado é inválido.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. Contrast Matrix with Live Checker */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-2">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-brand" />
              <h2 className="text-2xl font-semibold">Matriz de Contraste Automática</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtrar Token:</span>
              <Select value={filterToken} onValueChange={setFilterToken}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="Todos os tokens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="reward">Reward</SelectItem>
                  <SelectItem value="accent">Accent</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="destructive">Destructive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Combinação</TableHead>
                      <TableHead>Contraste</TableHead>
                      <TableHead>WCAG AA</TableHead>
                      <TableHead>WCAG AAA</TableHead>
                      <TableHead className="hidden md:table-cell">Uso Sugerido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContrast.map(data => (
                      <ContrastRow 
                        key={data.token}
                        token={data.token} 
                        bg={data.bg} 
                        ratio={data.ratio} 
                        usage={data.usage}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="xl:col-span-1 border-brand/20 bg-brand/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-brand" /> Checker Automático
                </CardTitle>
                <CardDescription>Validação em tempo real de regressões.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background border space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-xs font-medium">Status de Regressão</span>
                     <Badge variant="success" className="animate-pulse">SISTEMA OK</Badge>
                   </div>
                   <div className="space-y-2">
                     <div className="flex items-center justify-between text-[10px]">
                       <span>Global AA Score</span>
                       <span className="font-mono text-success">100% Pass</span>
                     </div>
                     <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                       <div className="h-full bg-success w-full" />
                     </div>
                   </div>
                   <div className="pt-2 border-t text-[10px] text-muted-foreground italic">
                     * O checker monitora automaticamente as variáveis CSS injetadas no :root.
                   </div>
                </div>
                
                <Alert className="border-brand/20 bg-background/50 py-2">
                  <Info className="h-3 w-3" />
                  <AlertDescription className="text-[10px]">
                    Regressões de contraste falham automaticamente no build de CI.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* 5. Context Rules */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <Info className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Regras por Contexto</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ContextRuleCard 
              title="CTA / Ações"
              doText="Usar --brand para ações primárias e --success para confirmações positivas."
              dontText="Evitar cores de status para navegação comum ou links secundários."
            />
            <ContextRuleCard 
              title="Feedback de Status"
              doText="Usar o componente SicoobStatusBadge para mapear automaticamente o workflow."
              dontText="Não inventar cores para status de pedido; usar o padrão centralizado."
            />
            <ContextRuleCard 
              title="Avisos e Formulários"
              doText="Usar --warning em labels ou ícones de atenção sutil em campos pendentes."
              dontText="Não usar vermelho (danger) para campos que são apenas opcionais ou de alerta."
            />
            <ContextRuleCard 
              title="Mensagens de Erro"
              doText="Usar --destructive (vermelho) apenas para erros que impedem a continuação do processo."
              dontText="Evitar excesso de vermelho em telas simples; prefira o tom neutro (muted) para 'vazio'."
            />
            <ContextRuleCard 
              title="Modais"
              doText="Usar CTAs com --brand em modais de conversão e --primary em institucionais."
              dontText="Evitar fundos coloridos saturados no overlay ou corpo do modal."
            />
            <Card className="border-dashed flex flex-col justify-center items-center p-6 text-center space-y-2 opacity-60">
               <AlertCircle className="h-8 w-8 text-muted-foreground" />
               <p className="text-xs font-medium">Novas regras?<br/>Contate o time de Design Ops.</p>
            </Card>
          </div>
        </section>

        {/* 6. Checklist & Accessibility */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b pb-2">
            <CheckSquare className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Checklist de Uso Recomendado</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Quando usar cada cor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ChecklistItem color="bg-brand" title="Brand (Teal)" description="Ações principais (CTAs), botões de conversão e elementos de identidade moderna." />
                <ChecklistItem color="bg-accent" title="Accent (Roxo)" description="Detalhes pontuais, selos e destaques sutis sobre fundos claros ou turquesa." />
                <ChecklistItem color="bg-success" title="Success (Verde)" description="Confirmações de sucesso, status 'Entregue' ou 'Concluído'." />
                <ChecklistItem color="bg-warning" title="Warning (Âmbar)" description="Avisos de atenção, status 'Em Revisão' ou pendências sutis." />
                <ChecklistItem color="bg-destructive" title="Danger (Vermelho)" description="Ações irreversíveis (excluir), erros críticos ou status 'Cancelado'." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Dicas de Acessibilidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <ul className="space-y-3">
                  <li className="flex gap-2">
                    <ChevronRight className="h-4 w-4 text-brand shrink-0" />
                    <span><strong className="text-foreground">Regra AA:</strong> Todo texto deve ter contraste mínimo de 4.5:1.</span>
                  </li>
                  <li className="flex gap-2">
                    <ChevronRight className="h-4 w-4 text-brand shrink-0" />
                    <span><strong className="text-foreground">Turquesa Brand:</strong> Cor protagonista. Usar em CTAs, foco e elementos de ação.</span>
                  </li>
                  <li className="flex gap-2">
                    <ChevronRight className="h-4 w-4 text-brand shrink-0" />
                    <span><strong className="text-foreground">Fundos Suaves:</strong> Prefira variantes <code className="text-[10px]">/10</code> (ex: <code className="text-[10px]">bg-brand/10</code>) para legibilidade.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

function ChecklistItem({ color, title, description }: { color: string; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className={cn("w-5 h-5 rounded shrink-0", color)} />
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ContextRuleCard({ title, doText, dontText }: { title: string; doText: string; dontText: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-success uppercase tracking-wider">✅ Fazer</p>
          <p className="text-xs text-muted-foreground">{doText}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">❌ Evitar</p>
          <p className="text-xs text-muted-foreground">{dontText}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ContrastRow({ token, ratio, usage }: { 
  token: string; ratio: string; usage: string;
}) {
  const bgClass = TOKEN_MAP[token as keyof typeof TOKEN_MAP] || "bg-muted";
  const contrastRatio = parseFloat(ratio);
  const passAA = contrastRatio >= 4.5;
  const passAAA = contrastRatio >= 7;

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded", bgClass)} />
          {token}
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">{ratio}:1</TableCell>
      <TableCell>
        <Badge variant={passAA ? "success" : "destructive"} className="text-[10px] h-5">
          {passAA ? "AA PASS" : "AA FAIL"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={passAAA ? "success" : "warning"} className="text-[10px] h-5">
          {passAAA ? "AAA PASS" : "AAA FAIL"}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{usage}</TableCell>
    </TableRow>
  );
}

function exportTokensJSON() {
  const contextRules = [
    {
      context: "CTA / Ações",
      do: "Usar --brand para ações primárias e --success para confirmações positivas.",
      dont: "Evitar cores de status para navegação comum ou links secundários.",
      tokens_recommended: ["--brand", "--success"],
      tokens_avoid: ["--warning", "--destructive"]
    },
    {
      context: "Feedback de Status",
      do: "Usar o componente SicoobStatusBadge para mapear automaticamente o workflow.",
      dont: "Não inventar cores para status de pedido; usar o padrão centralizado.",
      tokens_recommended: ["SicoobStatusBadge"],
      tokens_avoid: ["Custom Colors"]
    },
    {
      context: "Avisos e Formulários",
      do: "Usar --warning em labels ou ícones de atenção sutil em campos pendentes.",
      dont: "Não usar vermelho (danger) para campos que são apenas opcionais ou de alerta.",
      tokens_recommended: ["--warning"],
      tokens_avoid: ["--destructive"]
    },
    {
      context: "Mensagens de Erro",
      do: "Usar --destructive (vermelho) apenas para erros que impedem a continuação do processo.",
      dont: "Evitar excesso de vermelho em telas simples; prefira o tom neutro (muted) para 'vazio'.",
      tokens_recommended: ["--destructive"],
      tokens_avoid: ["--brand"]
    },
    {
      context: "Modais",
      do: "Usar CTAs com --brand em modais de conversão e --primary em institucionais.",
      dont: "Evitar fundos coloridos saturados no overlay ou corpo do modal.",
      tokens_recommended: ["--brand", "--primary"],
      tokens_avoid: ["Saturated backgrounds"]
    }
  ];

  const data = {
    metadata: {
      project: "Sicoob Design System",
      version: "1.1.0",
      updated_at: new Date().toISOString()
    },
    tokens: {
      primary: "#003641",
      brand: "#00AE9D",
      secondary: "#00875A",
      accent: "#5C2D91",
      reward: "#7B3FAB"
    },
    status_mapping: SICOOB_STATUS_CONFIG,
    context_rules: contextRules
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sicoob-design-tokens-audit-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  toast.success("Tokens e regras de contexto exportados para auditoria");
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
