// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, Download, Share, PlusSquare, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";

export default function PWAInstallPage() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isMobile = useIsMobile();

  return (
    <>
      <PageSEO title="Instalar App" description="Tenha o Portal de Brindes Sicoob sempre à mão no seu celular." path="/instalar" noIndex />
      
      <div className="max-w-md mx-auto p-4 lg:p-6 space-y-6 animate-fade-in pb-24 md:pb-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold">Experiência Mobile</h1>
          <p className="text-sm text-muted-foreground">Instale o aplicativo para acesso rápido, notificações e performance superior.</p>
        </div>

        {isInstalled ? (
          <Card className="border-sicoob-green/20 bg-sicoob-green/5">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-sicoob-green/10 flex items-center justify-center text-sicoob-green">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sicoob-green-dark">Aplicativo Instalado!</h3>
                <p className="text-xs text-muted-foreground mt-1">Você já está usando a versão otimizada da plataforma.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
                Ir para a Home
              </Button>
            </CardContent>
          </Card>
        ) : isInstallable ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Instalar agora</h3>
                  <p className="text-xs text-muted-foreground mt-1">Clique no botão abaixo para adicionar à sua tela de início.</p>
                </div>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={install}>
                Instalar Aplicativo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground text-center">Como Instalar Manualmente</h3>
            
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">1</span>
                    No iPhone (iOS / Safari)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p className="flex items-center gap-2">
                    <Share className="h-3.5 w-3.5" /> Toque no ícone de <strong>Compartilhar</strong> na barra inferior.
                  </p>
                  <p className="flex items-center gap-2">
                    <PlusSquare className="h-3.5 w-3.5" /> Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
                  </p>
                  <p className="flex items-center gap-2 text-primary font-medium">
                    <ArrowRight className="h-3.5 w-3.5" /> Confirme clicando em <strong>Adicionar</strong> no topo direito.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">2</span>
                    No Android (Chrome)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>Toque no ícone de <strong>três pontos (⋮)</strong> no canto superior direito.</p>
                  <p>Selecione a opção <strong>Instalar Aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
            <Zap className="h-5 w-5 text-amber-500 mb-2" />
            <h4 className="text-xs font-bold uppercase tracking-tight">Performance</h4>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Carregamento instantâneo mesmo com conexões lentas.</p>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
            <ShieldCheck className="h-5 w-5 text-sicoob-green mb-2" />
            <h4 className="text-xs font-bold uppercase tracking-tight">Segurança</h4>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Acesso protegido e integração direta com o sistema Sicoob.</p>
          </div>
        </div>
      </div>
    </>
  );
}
