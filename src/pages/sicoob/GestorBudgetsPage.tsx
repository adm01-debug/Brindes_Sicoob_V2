import { BudgetsTab } from '@/pages/admin/sicoob/tabs/BudgetsTab';
import { PageSEO } from '@/components/seo/PageSEO';

export default function GestorBudgetsPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageSEO
        title="Verbas dos PAs"
        description="Distribua e acompanhe a verba mensal de cada PA da sua Singular."
        path="/gestor/verbas"
        noIndex
      />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Verbas dos PAs</h1>
        <p className="text-muted-foreground">
          Defina o teto de cada PA e o limite de alçada da sua Singular sem depender da Promo.
        </p>
      </div>
      <BudgetsTab />
    </div>
  );
}
