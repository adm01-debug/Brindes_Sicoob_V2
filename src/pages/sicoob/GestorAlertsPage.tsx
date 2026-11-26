import { NotificationSettingsTab } from '@/pages/admin/sicoob/tabs/NotificationSettingsTab';
import { PageSEO } from '@/components/seo/PageSEO';

export default function GestorAlertsPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageSEO
        title="Alertas da Singular"
        description="Escolha quem recebe os avisos de aprovação da sua unidade."
        path="/gestor/alertas"
        noIndex
      />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Alertas e avisos</h1>
        <p className="text-muted-foreground">
          Configure os avisos de aprovação da Singular sem precisar de um administrador da Promo.
        </p>
      </div>
      <NotificationSettingsTab />
    </div>
  );
}
