import { ApprovalDelegationsTab } from '@/pages/admin/sicoob/tabs/ApprovalDelegationsTab';
import { PageSEO } from '@/components/seo/PageSEO';

export default function GestorDelegationsPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageSEO
        title="Delegações de aprovação"
        description="Registre substituições temporárias para decisões da sua unidade."
        path="/gestor/delegacoes"
        noIndex
      />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Delegações de aprovação</h1>
        <p className="text-muted-foreground">
          Organize férias e ausências sem interromper as decisões da Singular.
        </p>
      </div>
      <ApprovalDelegationsTab />
    </div>
  );
}
