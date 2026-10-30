/**
 * Fiscal info panel for a supplier source — with inline editing.
 * Shows CST, CFOP, ICMS, PIS, COFINS, CEST, CSOSN, operation_nature
 * from variant_supplier_sources + supplier_branches.
 * Shows "Herdado" badge when data comes from branch defaults.
 * Allows overriding inherited values per product.
 */
import { isNullish } from "@/components/admin/utils/nullish";
import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, FileText, Loader2, ArrowDownFromLine, Pencil, Save, X, RotateCcw } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/common/ConfirmDialog';
import { useSupplierFiscalData, type FiscalOverrideInput, type SupplierFiscalData } from '@/hooks/useSupplierFiscalData';
import { toast } from 'sonner';

interface Props {
  productId: string | undefined;
  supplierId: string | undefined;
}

// ── Inline edit field ──────────────────────────────────────────────────────────

function EditField({ label, value, onChange, mono = false, placeholder, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        className={`h-7 text-xs px-2 w-24 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

// ── Read-only helpers ──────────────────────────────────────────────────────────

function FiscalFieldPair({ label1, value1, label2, value2, mono = false }: {
  label1: string; value1: string | null | undefined;
  label2: string; value2: string | null | undefined;
  mono?: boolean;
}) {
  if (!value1 && !value2) return null;
  return (
    <div className="flex items-baseline gap-1.5">
      {value1 && (
        <>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{label1}:</span>
          <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value1}</span>
        </>
      )}
      {value1 && value2 && <span className="text-[10px] text-muted-foreground/50 mx-0.5">/</span>}
      {value2 && (
        <>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{label2}:</span>
          <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value2}</span>
        </>
      )}
    </div>
  );
}

function FiscalField({ label, value, mono = false }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  if (isNullish(value) || value === '') return null;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function formatRate(rate: number | null | undefined): string | null {
  if (isNullish(rate)) return null;
  return `${rate}%`;
}

function formatTaxRegime(regime: string | null): string | null {
  if (!regime) return null;
  const map: Record<string, string> = {
    simples_nacional: 'Simples Nacional',
    lucro_presumido: 'Lucro Presumido',
    lucro_real: 'Lucro Real',
    mei: 'MEI',
  };
  return map[regime] || regime;
}

function hasFiscalData(data: SupplierFiscalData): boolean {
  return Boolean(data.cst || data.cfop || !isNullish(data.icms_rate) || !isNullish(data.pis_rate));
}

function hasBranchData(data: SupplierFiscalData): boolean {
  return Boolean(data.branch_name || data.branch_cnpj);
}

function shouldShowFiscalInfo(data: SupplierFiscalData, isEditing: boolean): boolean {
  return isEditing || hasFiscalData(data) || hasBranchData(data);
}

function FiscalHeader({ data, isEditing, isSaving, onEdit, onCancel, onSave, onRevert }: {
  data: SupplierFiscalData;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onRevert: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FileText className="h-3 w-3 text-muted-foreground" />
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Fiscal do Fornecedor</span>
      {data.isInherited && !isEditing && (
        <Badge variant="outline" className="text-[10px] h-5 ml-1 gap-1 text-warning border-warning/30 bg-warning/5">
          <ArrowDownFromLine className="h-2.5 w-2.5" /> Herdado da filial
        </Badge>
      )}
      {isEditing && (
        <Badge variant="outline" className="text-[10px] h-5 ml-1 gap-1 text-info border-info/30 bg-info/5">
          <Pencil className="h-2.5 w-2.5" /> Editando
        </Badge>
      )}
      <div className="ml-auto flex items-center gap-1">
        {isEditing ? (
          <>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={onCancel} disabled={isSaving}>
              <X className="h-3 w-3" /> Cancelar
            </Button>
            <Button variant="default" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-1">
            {!data.isInherited && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-destructive hover:text-destructive" onClick={onRevert}>
                <RotateCcw className="h-3 w-3" /> Reverter
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={onEdit}>
              <Pencil className="h-3 w-3" /> {data.isInherited ? 'Sobrescrever' : 'Editar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function BranchInfo({ data }: { data: SupplierFiscalData }) {
  if (!hasBranchData(data)) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Building2 className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs font-medium">{data.branch_name}</span>
      {data.branch_cnpj && <Badge variant="outline" className="text-[10px] font-mono h-5">{data.branch_cnpj}</Badge>}
      {data.branch_state_uf && <Badge variant="secondary" className="text-[10px] h-5">{data.branch_state_uf}</Badge>}
      {data.branch_tax_regime && <Badge variant="secondary" className="text-[10px] h-5">{formatTaxRegime(data.branch_tax_regime)}</Badge>}
    </div>
  );
}

function inputValue(value: string | null): string {
  return value ?? '';
}

function rateInputValue(value: number | null): string {
  return isNullish(value) ? '' : String(value);
}

function FiscalEditForm({ form, onChange }: { form: FiscalOverrideInput; onChange: (field: keyof FiscalOverrideInput, value: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-md bg-muted/30 border border-border/50">
      <EditField label="CST" value={inputValue(form.cst)} onChange={value => onChange('cst', value)} mono placeholder="Ex: 060" />
      <EditField label="CFOP" value={inputValue(form.cfop)} onChange={value => onChange('cfop', value)} mono placeholder="Ex: 5102" />
      <EditField label="ICMS (%)" value={rateInputValue(form.icms_rate)} onChange={value => onChange('icms_rate', value)} type="number" placeholder="Ex: 17" />
      <EditField label="PIS (%)" value={rateInputValue(form.pis_rate)} onChange={value => onChange('pis_rate', value)} type="number" placeholder="Ex: 0.65" />
      <EditField label="COFINS (%)" value={rateInputValue(form.cofins_rate)} onChange={value => onChange('cofins_rate', value)} type="number" placeholder="Ex: 3" />
      <EditField label="CEST" value={inputValue(form.cest)} onChange={value => onChange('cest', value)} mono placeholder="Ex: 2804200" />
      <EditField label="CSOSN" value={inputValue(form.csosn)} onChange={value => onChange('csosn', value)} mono placeholder="Ex: 500" />
      <EditField label="Natureza da Op." value={inputValue(form.operation_nature)} onChange={value => onChange('operation_nature', value)} placeholder="Ex: Venda de Merc." />
    </div>
  );
}

function FiscalReadView({ data }: { data: SupplierFiscalData }) {
  if (!hasFiscalData(data)) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <FiscalField label="CST" value={data.cst} mono />
      {data.isInherited && data.cfop_interstate
        ? <FiscalFieldPair label1="CFOP Int." value1={data.cfop} label2="Interestadual" value2={data.cfop_interstate} mono />
        : <FiscalField label="CFOP" value={data.cfop} mono />}
      <FiscalField label="ICMS" value={formatRate(data.icms_rate)} />
      <FiscalField label="PIS" value={formatRate(data.pis_rate)} />
      <FiscalField label="COFINS" value={formatRate(data.cofins_rate)} />
      <FiscalField label="CEST" value={data.cest} mono />
      <FiscalField label="CSOSN" value={data.csosn} mono />
      <FiscalField label="Natureza" value={data.operation_nature} />
    </div>
  );
}

function BranchReferenceRates({ data, isEditing }: { data: SupplierFiscalData; isEditing: boolean }) {
  const hasRates = !isNullish(data.branch_icms_internal) || !isNullish(data.branch_icms_interstate);
  if (isEditing || !hasRates) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
      <FiscalField label="ICMS Ref. Interno" value={formatRate(data.branch_icms_internal)} />
      <FiscalField label="ICMS Ref. Interestadual" value={formatRate(data.branch_icms_interstate)} />
    </div>
  );
}

function InheritanceHint({ data, isEditing }: { data: SupplierFiscalData; isEditing: boolean }) {
  if (!data.isInherited || isEditing) return null;
  return (
    <p className="text-[10px] text-muted-foreground/70 italic">
      Dados herdados da filial padrão. Clique em "Sobrescrever" para definir valores específicos para este produto.
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SupplierFiscalInfo({ productId, supplierId }: Props) {
  const { data, isLoading, saveFiscalOverride, revertToInherited } = useSupplierFiscalData(productId, supplierId);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  // Edit form state
  const [form, setForm] = useState<FiscalOverrideInput>({
    cst: null, cfop: null, icms_rate: null,
    pis_rate: null, cofins_rate: null, cest: null,
    csosn: null, operation_nature: null,
  });

  const startEditing = useCallback(() => {
    if (!data) return;
    setForm({
      cst: data.cst,
      cfop: data.cfop,
      icms_rate: data.icms_rate,
      pis_rate: data.pis_rate,
      cofins_rate: data.cofins_rate,
      cest: data.cest,
      csosn: data.csosn,
      operation_nature: data.operation_nature,
    });
    setIsEditing(true);
  }, [data]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await saveFiscalOverride(form);
      if (success) {
        toast.success('Dados fiscais salvos com sucesso');
        setIsEditing(false);
      } else {
        toast.error('Erro ao salvar dados fiscais. Verifique se o produto possui variantes cadastradas.');
      }
    } catch {
      toast.error('Erro ao salvar dados fiscais');
    } finally {
      setIsSaving(false);
    }
  }, [form, saveFiscalOverride]);

  const handleRevert = useCallback(async () => {
    setIsReverting(true);
    try {
      const success = await revertToInherited();
      if (success) {
        toast.success('Dados revertidos para herança da filial');
        setShowRevertDialog(false);
      } else {
        toast.error('Erro ao reverter dados fiscais');
      }
    } catch {
      toast.error('Erro ao reverter dados fiscais');
    } finally {
      setIsReverting(false);
    }
  }, [revertToInherited]);

  const updateField = useCallback((field: keyof FiscalOverrideInput, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value === '' ? null : (['icms_rate', 'pis_rate', 'cofins_rate'].includes(field) ? parseFloat(value) || null : value),
    }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando dados fiscais...
      </div>
    );
  }

  if (!data) return null;

  if (!shouldShowFiscalInfo(data, isEditing)) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
      <FiscalHeader
        data={data}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={startEditing}
        onCancel={cancelEditing}
        onSave={handleSave}
        onRevert={() => setShowRevertDialog(true)}
      />
      <BranchInfo data={data} />
      {isEditing
        ? <FiscalEditForm form={form} onChange={updateField} />
        : <FiscalReadView data={data} />}
      <BranchReferenceRates data={data} isEditing={isEditing} />
      <InheritanceHint data={data} isEditing={isEditing} />
      <DeleteConfirmDialog
        open={showRevertDialog}
        onOpenChange={setShowRevertDialog}
        entityName="sobrescrita fiscal"
        itemName="dados fiscais específicos"
        onConfirm={handleRevert}
        loading={isReverting}
        affectedItems={[
          'Os dados fiscais específicos deste produto serão removidos',
          'O sistema voltará a usar os dados herdados da filial',
        ]}
      />
    </div>
  );
}
