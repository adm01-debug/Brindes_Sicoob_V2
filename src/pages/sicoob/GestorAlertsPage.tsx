import { NotificationSettingsTab } from '@/pages/admin/sicoob/tabs/NotificationSettingsTab';
import { MfaGate } from '@/components/layout/MfaGate';
import { PageSEO } from '@/components/seo/PageSEO';

export default function GestorAlertsPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageSEO
        title="Alertas da Singular"
        description="Acompanhe quem recebe os avisos de aprovação da sua unidade."
        path="/gestor/alertas"
        noIndex
      />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Alertas e avisos</h1>
        <p className="text-muted-foreground">
          Acompanhe os canais de aviso de aprovação da Singular. A alteração é feita pela
          administração.
        </p>
      </div>
      <MfaGate>
        <NotificationSettingsTab readOnly />
      </MfaGate>
    </div>
  );
}
