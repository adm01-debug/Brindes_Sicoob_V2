import { useLocation, Link } from "react-router-dom";
import { PageSEO } from "@/components/seo/PageSEO";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ForbiddenPage = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" data-testid="app-forbidden">
      <PageSEO title="Acesso Negado" noIndex />
      <div className="text-center max-w-md mx-auto space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <span className="font-display text-sm font-semibold text-muted-foreground tracking-wide uppercase">
            Segurança do Sistema
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold font-display text-foreground">
            Acesso Negado
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Você não tem permissão para acessar a página <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{location.pathname}</code>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" size="lg" className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ir para o início
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
