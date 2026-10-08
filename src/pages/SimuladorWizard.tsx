/**
 * SimuladorWizard v2 - Produto → Local → Specs → Comparativo
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { useSimulatorWizard } from '@/hooks/simulator/useSimulatorWizard';
import { useWizardDrafts } from '@/hooks/simulator/useWizardDrafts';
import {
  WizardStepIndicator,
  StepProduct,
  StepLocation,
  StepSpecs,
  StepComparison,
  PersonalizationSummary,
  PersonalizationTabs,
  WizardContextBar,
  SimulatorErrorBoundary,
} from '@/components/simulator/wizard';
import { MobilePersonalizationSummary } from '@/components/simulator/wizard/MobilePersonalizationSummary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calculator, Save, FolderOpen, Trash2, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SelectedProduct } from '@/types/domain/simulator-wizard';

interface PreSelectedProductState {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string | null;
  categoryName?: string | null;
}

type Wizard = ReturnType<typeof useSimulatorWizard>;
type Draft = ReturnType<typeof useWizardDrafts>['drafts'][number];

function DraftsMenu({
  drafts,
  loading,
  loadDraft,
  deleteDraft,
}: {
  drafts: Draft[];
  loading: boolean;
  loadDraft: (draft: Draft) => void;
  deleteDraft: (id: string) => void;
}) {
  let content = (
    <div className="p-4 text-center text-sm text-muted-foreground">Nenhum rascunho salvo</div>
  );
  if (loading)
    content = (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  else if (drafts.length > 0)
    content = (
      <>
        {drafts.map((draft) => (
          <DropdownMenuItem
            key={draft.id}
            className="flex items-start justify-between gap-2 p-3"
            onClick={() => loadDraft(draft)}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{draft.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(draft.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                <span>• {draft.quantity}un</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir"
              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                deleteDraft(draft.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </DropdownMenuItem>
        ))}
      </>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5">
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden text-xs sm:inline">Rascunhos</span>
          {drafts.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {drafts.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WizardHeader({
  wizard,
  drafts,
  draftsLoading,
  loadDraft,
  deleteDraft,
  openSave,
}: {
  wizard: Wizard;
  drafts: Draft[];
  draftsLoading: boolean;
  loadDraft: (draft: Draft) => void;
  deleteDraft: (id: string) => void;
  openSave: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 flex items-center justify-between gap-3 px-1"
    >
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-2 shadow-md shadow-primary/25">
          <Calculator className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1
          data-testid="page-title-simulador"
          className="font-display text-lg font-bold tracking-tight"
        >
          Simulador
        </h1>
      </div>
      <div className="flex items-center gap-1.5">
        {wizard.selectedProduct && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5" onClick={openSave}>
            <Save className="h-3.5 w-3.5" />
            <span className="hidden text-xs sm:inline">Salvar</span>
          </Button>
        )}
        <DraftsMenu
          drafts={drafts}
          loading={draftsLoading}
          loadDraft={loadDraft}
          deleteDraft={deleteDraft}
        />
      </div>
    </motion.div>
  );
}

function CurrentWizardStep({ wizard }: { wizard: Wizard }) {
  const steps = {
    product: <StepProduct wizard={wizard} />,
    location: <StepLocation wizard={wizard} />,
    specs: <StepSpecs wizard={wizard} />,
    comparison: <StepComparison wizard={wizard} />,
  };
  return steps[wizard.currentStep];
}

function WizardFlow({
  wizard,
  showSidebar,
  addPersonalization,
  generateQuote,
}: {
  wizard: Wizard;
  showSidebar: boolean;
  addPersonalization: () => void;
  generateQuote: () => void;
}) {
  const personalizationFlow = wizard.selectedProduct !== null && wizard.currentStep !== 'product';
  return (
    <div className={`flex gap-6 ${showSidebar ? 'lg:pr-80' : ''}`}>
      <div className="min-w-0 flex-1">
        {personalizationFlow && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <WizardContextBar wizard={wizard} />
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sticky top-[var(--header-h,56px)] z-20 -mx-4 mb-8 bg-background/95 px-4 py-2 backdrop-blur-md sm:static sm:m-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
        >
          <WizardStepIndicator wizard={wizard} />
        </motion.div>
        {personalizationFlow && wizard.personalizations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mx-auto mb-6 max-w-5xl"
          >
            <PersonalizationTabs wizard={wizard} onAddNew={addPersonalization} />
          </motion.div>
        )}
        <SimulatorErrorBoundary
          onReset={wizard.resetWizard}
          onGoBack={() => wizard.setStep('product')}
        >
          <motion.div
            key={wizard.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="pb-16"
          >
            <CurrentWizardStep wizard={wizard} />
          </motion.div>
        </SimulatorErrorBoundary>
      </div>
      {showSidebar && (
        <motion.aside
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed bottom-8 right-4 top-32 hidden w-72 overflow-hidden rounded-2xl border bg-card shadow-xl lg:block"
        >
          <PersonalizationSummary
            wizard={wizard}
            onAddNew={addPersonalization}
            onGenerateQuote={generateQuote}
            showAddButton={!wizard.isEditingPersonalization}
          />
        </motion.aside>
      )}
    </div>
  );
}

function SaveDraftDialog({
  open,
  setOpen,
  title,
  setTitle,
  save,
  pending,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  save: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar Rascunho</DialogTitle>
          <DialogDescription>Salve o estado atual para continuar depois.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Nome do rascunho..."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && save()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={pending} className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SimuladorWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const wizard = useSimulatorWizard();
  const {
    drafts,
    saveDraft,
    saveDraftPending,
    deleteDraft,
    isLoading: draftsLoading,
  } = useWizardDrafts();
  const hasProcessedPreSelection = useRef(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const selectProduct = wizard.selectProduct;

  useEffect(() => {
    if (hasProcessedPreSelection.current) return;

    const preSelectedProduct = (location.state as { preSelectedProduct?: PreSelectedProductState })
      ?.preSelectedProduct;

    if (preSelectedProduct?.id) {
      hasProcessedPreSelection.current = true;

      const product: SelectedProduct = {
        id: preSelectedProduct.id,
        name: preSelectedProduct.name,
        sku: preSelectedProduct.sku,
        price: preSelectedProduct.price,
        imageUrl: preSelectedProduct.imageUrl,
        categoryName: preSelectedProduct.categoryName,
      };

      selectProduct(product);

      toast.success(`${preSelectedProduct.name} selecionado`, {
        description: 'Continue configurando a personalização',
        duration: 3000,
      });
    }
  }, [location.state, selectProduct]);

  const isInPersonalizationFlow =
    wizard.selectedProduct !== null && wizard.currentStep !== 'product';
  const showSidebar = isInPersonalizationFlow && wizard.personalizations.length > 0;

  const handleAddNewPersonalization = () => {
    wizard.startNewPersonalization();
  };

  const handleGenerateQuote = () => {
    const quoteData = {
      product: wizard.selectedProduct,
      quantity: wizard.quantity,
      personalizations: wizard.personalizations,
      totals: wizard.totals,
    };
    navigate('/orcamentos/novo', { state: { fromSimulator: true, simulationData: quoteData } });
    toast.success('Redirecionando para o orçamento...');
  };

  const handleSaveDraft = () => {
    const title =
      draftTitle.trim() || `${wizard.selectedProduct?.name || 'Rascunho'} - ${wizard.quantity}un`;
    saveDraft(title, wizard);
    setSaveDialogOpen(false);
    setDraftTitle('');
  };

  const handleLoadDraft = (draft: (typeof drafts)[0]) => {
    if (draft.product_data) {
      wizard.selectProduct(draft.product_data);
      wizard.setQuantity(draft.quantity);
      // Personalizations will be restored via the product selection flow
      toast.success(`Rascunho "${draft.title}" carregado`);
    }
  };

  return (
    <>
      <>
        <PageSEO
          title="Simulador de Personalização"
          description="Simule personalizações de brindes com cálculo automático de custos."
          path="/simulador"
        />
        <div className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
          <WizardHeader
            wizard={wizard}
            drafts={drafts}
            draftsLoading={draftsLoading}
            loadDraft={handleLoadDraft}
            deleteDraft={deleteDraft}
            openSave={() => {
              setDraftTitle(`${wizard.selectedProduct?.name} - ${wizard.quantity}un`);
              setSaveDialogOpen(true);
            }}
          />
          <WizardFlow
            wizard={wizard}
            showSidebar={showSidebar}
            addPersonalization={handleAddNewPersonalization}
            generateQuote={handleGenerateQuote}
          />

          {/* Mobile Summary Bottom Bar */}
          {showSidebar && (
            <MobilePersonalizationSummary
              wizard={wizard}
              onAddNew={handleAddNewPersonalization}
              onGenerateQuote={handleGenerateQuote}
            />
          )}
        </div>
      </>

      <SaveDraftDialog
        open={saveDialogOpen}
        setOpen={setSaveDialogOpen}
        title={draftTitle}
        setTitle={setDraftTitle}
        save={handleSaveDraft}
        pending={saveDraftPending}
      />
    </>
  );
}
