import { useState } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { QuoteTemplatesList } from '@/components/quotes/QuoteTemplatesList';
import { QuoteTemplateForm } from '@/components/quotes/QuoteTemplateForm';
import { AdminTemplatesManager } from '@/components/quotes/AdminTemplatesManager';
import { type QuoteTemplate, useQuoteTemplates } from '@/hooks/useQuoteTemplates';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Users } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';
type ActiveTab = 'my-templates' | 'all-templates';

function viewCopy(viewMode: ViewMode, template: QuoteTemplate | null) {
  if (viewMode === 'create')
    return { title: 'Novo Template', description: 'Crie um novo template de orçamento' };
  if (viewMode === 'edit')
    return { title: 'Editar Template', description: `Editando: ${template?.name}` };
  return {
    title: 'Templates de Orçamento',
    description: 'Gerencie seus templates reutilizáveis para orçamentos',
  };
}

function TemplatesHeader({
  viewMode,
  template,
  onBack,
}: {
  viewMode: ViewMode;
  template: QuoteTemplate | null;
  onBack: () => void;
}) {
  const copy = viewCopy(viewMode, template);
  return (
    <div className="flex items-center gap-4">
      {viewMode !== 'list' && (
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div>
        <h1
          data-testid="page-title-orcamentos-templates"
          className="font-display text-2xl font-bold tracking-tight"
        >
          {copy.title}
        </h1>
        <p className="text-muted-foreground">{copy.description}</p>
      </div>
    </div>
  );
}

function TemplatesListContent({
  isAdmin,
  activeTab,
  onTabChange,
  onCreate,
  onEdit,
}: {
  isAdmin: boolean;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onCreate: () => void;
  onEdit: (template: QuoteTemplate) => void;
}) {
  if (!isAdmin) return <QuoteTemplatesList onCreateTemplate={onCreate} onEditTemplate={onEdit} />;
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as ActiveTab)}>
      <TabsList>
        <TabsTrigger value="my-templates" className="gap-2">
          <FileText className="h-4 w-4" />
          Meus Templates
        </TabsTrigger>
        <TabsTrigger value="all-templates" className="gap-2">
          <Users className="h-4 w-4" />
          Todos os Templates
        </TabsTrigger>
      </TabsList>
      <TabsContent value="my-templates" className="mt-4">
        <QuoteTemplatesList onCreateTemplate={onCreate} onEditTemplate={onEdit} />
      </TabsContent>
      <TabsContent value="all-templates" className="mt-4">
        <AdminTemplatesManager onEditTemplate={onEdit} />
      </TabsContent>
    </Tabs>
  );
}

function TemplatesContent({
  viewMode,
  template,
  isAdmin,
  activeTab,
  onTabChange,
  onCreate,
  onEdit,
  onComplete,
}: {
  viewMode: ViewMode;
  template: QuoteTemplate | null;
  isAdmin: boolean;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onCreate: () => void;
  onEdit: (template: QuoteTemplate) => void;
  onComplete: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <TemplatesListContent
        isAdmin={isAdmin}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCreate={onCreate}
        onEdit={onEdit}
      />
    );
  }
  return <QuoteTemplateForm template={template} onSave={onComplete} onCancel={onComplete} />;
}

export default function QuoteTemplatesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('my-templates');
  const { isAdmin } = useQuoteTemplates();

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setViewMode('create');
  };

  const handleEditTemplate = (template: QuoteTemplate) => {
    setEditingTemplate(template);
    setViewMode('edit');
  };

  const handleSaveComplete = () => {
    setViewMode('list');
    setEditingTemplate(null);
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingTemplate(null);
  };

  return (
    <>
      <PageSEO
        title="Modelos de Orçamento"
        description="Gerencie modelos para criar orçamentos rapidamente."
        path="/orcamentos/modelos"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <TemplatesHeader viewMode={viewMode} template={editingTemplate} onBack={handleCancel} />
        <TemplatesContent
          viewMode={viewMode}
          template={editingTemplate}
          isAdmin={isAdmin}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCreate={handleCreateTemplate}
          onEdit={handleEditTemplate}
          onComplete={handleSaveComplete}
        />
      </div>
    </>
  );
}
