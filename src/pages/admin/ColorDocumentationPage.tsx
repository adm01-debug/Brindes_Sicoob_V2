import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SicoobStatusBadge } from "@/components/sicoob/SicoobStatusBadge";
import { SicoobFulfillmentStatus, SICOOB_STATUS_CONFIG } from "@/lib/sicoob-status-config";
import { Palette, CheckCircle2, AlertTriangle, Info, Trophy, Layout, Download, Table as TableIcon, Hash, CheckSquare, Eye, EyeOff } from "lucide-react";
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
import { useTheme } from "@/contexts/ThemeContext";

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

  const filteredContrast = filterToken === "all" 
    ? contrastData 
    : contrastData.filter(d => d.token === filterToken);

  return (
    <MainLayout>
      <div className="container max-w-6xl py-10 space-y-12">
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
              Modo Demo
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
        {/* 4. Contrast Matrix */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-2">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-brand" />
              <h2 className="text-2xl font-semibold">Matriz de Contraste (WCAG AA)</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtrar:</span>
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
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Token</TableHead>
                    <TableHead>Background</TableHead>
                    <TableHead>Contraste</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uso Sugerido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContrast.map(data => (
                    <ContrastRow 
                      key={data.token}
                      token={data.token} 
                      bg={data.bg} 
                      label={`${data.token} vs BG`} 
                      ratio={data.ratio} 
                      pass={data.pass}
                      usage={data.usage}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
        
        {/* 5. Usage Checklist */}
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
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-brand shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Brand (Teal)</p>
                    <p className="text-xs text-muted-foreground">Ações principais (CTAs), botões de conversão e elementos que trazem a identidade moderna do Sicoob 2024.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-accent shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Accent (Amarelo)</p>
                    <p className="text-xs text-muted-foreground">Destaques sutis, selos de urgência ou elementos que remetam a prêmios e moedas. No modo dark, usar sempre sobre fundo escuro (institucional).</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-success shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Success (Verde Sicoob)</p>
                    <p className="text-xs text-muted-foreground">Confirmações de sucesso, status 'Entregue' ou 'Concluído'. É um verde mais sóbrio que o brand.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-warning shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Warning (Amarelo/Ouro)</p>
                    <p className="text-xs text-muted-foreground">Avisos de atenção, status 'Em Revisão' ou pendências que não impedem o fluxo, mas precisam de cuidado.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Danger/Destructive (Vermelho)</p>
                    <p className="text-xs text-muted-foreground">Ações irreversíveis (excluir), erros críticos ou status 'Cancelado/Rejeitado'.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Dicas de Contraste e Acessibilidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Regra AA:</strong> Todo texto deve ter contraste mínimo de 4.5:1 contra o fundo.</li>
                  <li><strong className="text-foreground">Amarelo Accent:</strong> Nunca use texto branco sobre o amarelo. Use sempre o verde institucional (<code className="text-[10px]">--primary</code>) como foreground.</li>
                  <li><strong className="text-foreground">Fundos Suaves:</strong> Prefira usar as variantes <code className="text-[10px]">/10</code> (ex: <code className="text-[10px]">bg-brand/10</code>) para áreas grandes, mantendo a cor pura apenas para o texto/ícone.</li>
                  <li><strong className="text-foreground">Modo Dark:</strong> No tema escuro, a luminosidade do <code className="text-[10px]">--primary</code> e <code className="text-[10px]">--reward</code> foi aumentada para garantir leitura sobre fundo <code className="text-[10px]">#000</code>.</li>
                  <li><strong className="text-foreground">Hierarquia 60/30/10:</strong> 60% neutros, 30% marca (teal/escuro) e 10% destaques (amarelo/roxo).</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

function ContrastRow({ token, bg, label, ratio, pass, usage }: { 
  token: string; bg: string; label: string; ratio: string; pass: boolean; usage: string;
}) {
  const bgClass = TOKEN_MAP[token as keyof typeof TOKEN_MAP] || "bg-muted";
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded", bgClass)} />
          {token}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">hsl(var(--{bg}))</TableCell>
      <TableCell className="font-mono text-xs">{ratio}:1</TableCell>
      <TableCell>
        <Badge variant={pass ? "success" : "destructive"}>
          {pass ? "PASS" : "FAIL"}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{usage}</TableCell>
    </TableRow>
  );
}

function exportTokensJSON() {
  const data = {
    metadata: {
      project: "Sicoob Design System",
      version: "1.0.0",
      updated_at: new Date().toISOString()
    },
    tokens: {
      brand: "#00AE9D",
      primary: "#003641",
      secondary: "#7DB61C",
      accent: "#FFBB00",
      reward: "#5C2D91"
    },
    status_mapping: SICOOB_STATUS_CONFIG
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sicoob-design-tokens-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  toast.success("Tokens exportados com sucesso");
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
