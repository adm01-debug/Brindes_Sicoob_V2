// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { QuotesListPage } from "./QuotesListPage";
import { OrderTemplatesSheet } from "@/components/orders/OrderTemplatesSheet";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * MeusOrcamentos — View principal para Comprador PAC (Gerente PA).
 */
export default function MeusOrcamentos() {
  const navigate = useNavigate();

  return (
    <>
      <PageSEO title="Meus Orçamentos" description="Gerencie suas solicitações de brinde." path="/meus-orcamentos" />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Meus Orçamentos
            </h1>
            <p className="text-muted-foreground text-sm">Acompanhe suas solicitações e crie novos pedidos.</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <OrderTemplatesSheet onApplyTemplate={(items) => navigate("/orcamentos/novo", { state: { templateItems: items } })} />
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => navigate("/orcamentos/novo")}>
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Button>
          </div>
        </div>

        <div className="border border-border/50 rounded-2xl bg-card/30 overflow-hidden">
          <QuotesListPage />
        </div>
      </div>
    </>
  );
}
