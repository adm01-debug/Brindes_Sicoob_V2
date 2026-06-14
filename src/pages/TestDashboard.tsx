import React from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  ShieldCheck, 
  Activity,
  Terminal,
  FileCode
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// This page simulates a test dashboard that would read from CI artifacts
export default function TestDashboard() {
  const coverageData = {
    lines: 78,
    statements: 82,
    functions: 65,
    branches: 58,
    lastRun: new Date().toLocaleString('pt-BR'),
    status: 'pass'
  };

  const playwrightResults = {
    total: 12,
    passed: 12,
    failed: 0,
    flaky: 0,
    duration: '4m 32s'
  };

  return (
    <>
      <PageSEO title="Test Health Dashboard" noIndex />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Saúde dos Testes & CI</h1>
            <p className="text-muted-foreground">Monitoramento de cobertura e resultados E2E em tempo real.</p>
          </div>
          <Badge className="bg-success text-success-foreground h-7 px-4 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Pipeline: Sucesso
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Unit & Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold">754</div>
                <div className="text-xs text-success flex items-center mb-1">
                  <Activity className="h-3 w-3 mr-1" /> 100% pass
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Playwright E2E</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold">{playwrightResults.passed}/{playwrightResults.total}</div>
                <div className="text-xs text-success flex items-center mb-1">
                   Determinístico
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Global Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold">{coverageData.lines}%</div>
                <div className="text-xs text-primary flex items-center mb-1">
                  Target: 60%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Last Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{coverageData.lastRun}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Branch: main</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Detalhes de Cobertura (Vitest)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Linhas</span>
                  <span className="font-bold">{coverageData.lines}%</span>
                </div>
                <Progress value={coverageData.lines} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Branches</span>
                  <span className="font-bold">{coverageData.branches}%</span>
                </div>
                <Progress value={coverageData.branches} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Funções</span>
                  <span className="font-bold">{coverageData.functions}%</span>
                </div>
                <Progress value={coverageData.functions} className="h-2" />
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" /> Arquivos Críticos de Segurança
                </h4>
                <div className="space-y-3">
                  {[
                    { name: 'useOrders.ts', cov: 92 },
                    { name: 'useRBAC.tsx', cov: 100 },
                    { name: 'orderExportUtils.ts', cov: 85 }
                  ].map(f => (
                    <div key={f.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                      <span className="font-mono">{f.name}</span>
                      <Badge variant={f.cov >= 80 ? "default" : "outline"}>{f.cov}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-5 w-5" /> Relatórios do CI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border border-dashed text-center space-y-3">
                <FileCode className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Os relatórios HTML/JUnit são gerados a cada commit e podem ser conferidos no GitHub Actions.</p>
                <Button variant="outline" size="sm" className="w-full gap-2">
                   Ver Artifacts do Playwright
                </Button>
                <Button variant="outline" size="sm" className="w-full gap-2">
                   Ver Relatório Vitest
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Configurações de Fail-Gate</h4>
                <ul className="text-xs space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-success" /> Cobertura mínima: 60%</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-success" /> Erros de tipagem (tsc): 0</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-success" /> Falhas de E2E permitidas: 0</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
