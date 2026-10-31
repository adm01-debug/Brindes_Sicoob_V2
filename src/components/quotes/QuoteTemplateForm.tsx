import { type FormEvent, type MouseEvent, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type QuoteTemplate, type QuoteTemplateItem, type CreateTemplateInput, useQuoteTemplates } from "@/hooks/useQuoteTemplates";
import { Save, X, AlertTriangle, RefreshCw } from "lucide-react";
import { QuoteTemplatePreview } from "./QuoteTemplatePreview";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface QuoteTemplateFormProps {
  template?: QuoteTemplate | null;
  initialItems?: QuoteTemplateItem[];
  onSave?: (template: QuoteTemplate | null) => void;
  onCancel?: () => void;
}

interface QuoteTemplateItemValidation {
  productId: string;
  productName: string;
  unitPrice: number;
  currentPrice: number;
  isValid: boolean;
  priceChanged: boolean;
}

function valueOrFallback<T>(value: T | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : value;
}

function initialTemplateForm(template: QuoteTemplate | null | undefined, initialItems: QuoteTemplateItem[]): CreateTemplateInput {
  const source: Partial<QuoteTemplate> = template ?? {};
  return {
    name: valueOrFallback(source.name, ""),
    description: valueOrFallback(source.description, ""),
    category: valueOrFallback(source.category, "Geral"),
    is_default: valueOrFallback(source.is_default, false),
    items_data: valueOrFallback(source.items_data, initialItems),
    discount_percent: valueOrFallback(source.discount_percent, 0),
    discount_amount: valueOrFallback(source.discount_amount, 0),
    notes: valueOrFallback(source.notes, ""),
    internal_notes: valueOrFallback(source.internal_notes, ""),
    payment_terms: valueOrFallback(source.payment_terms, ""),
    delivery_time: valueOrFallback(source.delivery_time, ""),
    validity_days: valueOrFallback(source.validity_days, 30),
  };
}

function formatTemplateCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function personalizationTotal(item: QuoteTemplateItem): number {
  return item.personalizations?.reduce((sum, personalization) => (
    sum + (personalization.unitCost ?? 0) * item.quantity + (personalization.setupCost ?? 0)
  ), 0) ?? 0;
}

function templateTotal(formData: CreateTemplateInput): number {
  const itemsTotal = (formData.items_data ?? []).reduce((sum, item) => (
    sum + item.quantity * item.unitPrice + personalizationTotal(item)
  ), 0);
  const percent = formData.discount_percent ?? 0;
  const discount = percent > 0 ? itemsTotal * (percent / 100) : (formData.discount_amount ?? 0);
  return itemsTotal - discount;
}

type UpdateField = <K extends keyof CreateTemplateInput>(field: K, value: CreateTemplateInput[K]) => void;

function useTemplateValidation(items: QuoteTemplateItem[] | null | undefined,
  validate: ReturnType<typeof useQuoteTemplates>["validateTemplateItems"]) {
  const [validation, setValidation] = useState<QuoteTemplateItemValidation[]>([]);
  useEffect(() => {
    if (!items?.length) return;
    let active = true;
    void validate(items).then((results) => { if (active) setValidation(results); });
    return () => { active = false; };
  }, [items, validate]);
  return { validation, setValidation, hasInvalid: validation.some((item) => !item.isValid),
    hasPriceChanges: validation.some((item) => item.isValid && item.currentPrice !== item.unitPrice) };
}

function ValidationAlerts({ form, update, state }: {
  form: CreateTemplateInput; update: UpdateField; state: ReturnType<typeof useTemplateValidation>;
}) {
  const updatePrices = (event: MouseEvent) => {
    event.preventDefault();
    update("items_data", (form.items_data || []).map((item) => {
      const validation = state.validation.find((candidate) => candidate.productId === item.productId);
      return validation?.isValid ? { ...item, unitPrice: validation.currentPrice } : item;
    }));
    state.setValidation(state.validation.map((item) => ({ ...item, unitPrice: item.currentPrice })));
  };
  if (!state.hasInvalid && !state.hasPriceChanges) return null;
  return <div className="space-y-3">{state.hasInvalid && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" />
    <AlertTitle>Produtos Indisponíveis</AlertTitle><AlertDescription>
      Alguns itens deste template não foram encontrados no catálogo atual. Eles podem ter sido removidos.
    </AlertDescription></Alert>}{state.hasPriceChanges && <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
      <RefreshCw className="h-4 w-4 text-amber-500" /><AlertTitle>Alteração de Preços</AlertTitle>
      <AlertDescription className="flex items-center justify-between"><span>Os preços de alguns produtos mudaram desde que o template foi criado.</span>
        <Button variant="outline" size="sm" className="h-7 border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          onClick={updatePrices}>Atualizar Preços</Button></AlertDescription></Alert>}
  </div>;
}

function BasicTemplateFields({ form, update }: { form: CreateTemplateInput; update: UpdateField }) {
  return <><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Nome do Template *</Label>
    <Input id="name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Ex: Kits Corporativos Padrão" required />
  </div><div className="space-y-2"><Label htmlFor="category">Categoria</Label><Input id="category" value={form.category || ""}
    onChange={(event) => update("category", event.target.value)} placeholder="Ex: Kits, Eventos, Promocional" /></div>
    <div className="space-y-2"><Label htmlFor="validity">Validade (dias)</Label><Input id="validity" type="number" min={1} max={365}
      value={form.validity_days || 30} onChange={(event) => update("validity_days", parseInt(event.target.value) || 30)} /></div>
  </div><div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={form.description || ""}
    onChange={(event) => update("description", event.target.value)} placeholder="Descreva o template para facilitar a identificação..." rows={2} /></div>
  <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Template Padrão</Label>
    <p className="text-sm text-muted-foreground">Será sugerido automaticamente ao criar novos orçamentos</p></div>
    <Switch checked={form.is_default} onCheckedChange={(checked) => update("is_default", checked)} /></div><Separator /></>;
}

function DiscountFields({ form, update }: { form: CreateTemplateInput; update: UpdateField }) {
  return <><div className="space-y-4"><h4 className="font-medium">Configurações de Desconto</h4><div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="discount_percent">Desconto (%)</Label><Input id="discount_percent" type="number" min={0} max={100} step={0.1}
      value={form.discount_percent || ""} onChange={(event) => { update("discount_percent", parseFloat(event.target.value) || 0); if (event.target.value) update("discount_amount", 0); }} placeholder="0" /></div>
    <div className="space-y-2"><Label htmlFor="discount_amount">Desconto Fixo (R$)</Label><Input id="discount_amount" type="number" min={0} step={0.01}
      value={form.discount_amount || ""} onChange={(event) => { update("discount_amount", parseFloat(event.target.value) || 0); if (event.target.value) update("discount_percent", 0); }} placeholder="0,00" /></div>
  </div></div><Separator /></>;
}

function TermsFields({ form, update }: { form: CreateTemplateInput; update: UpdateField }) {
  return <><div className="space-y-4"><h4 className="font-medium">Termos e Condições</h4><div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="payment_terms">Condições de Pagamento</Label><Input id="payment_terms" value={form.payment_terms || ""}
      onChange={(event) => update("payment_terms", event.target.value)} placeholder="Ex: 50% entrada + 50% na entrega" /></div>
    <div className="space-y-2"><Label htmlFor="delivery_time">Prazo de Entrega</Label><Input id="delivery_time" value={form.delivery_time || ""}
      onChange={(event) => update("delivery_time", event.target.value)} placeholder="Ex: 15 dias úteis" /></div>
  </div></div><Separator /></>;
}

function NotesFields({ form, update }: { form: CreateTemplateInput; update: UpdateField }) {
  return <div className="space-y-4"><h4 className="font-medium">Observações</h4><div className="space-y-2">
    <Label htmlFor="notes">Observações para o Cliente</Label><Textarea id="notes" value={form.notes || ""}
      onChange={(event) => update("notes", event.target.value)} placeholder="Observações que aparecerão na proposta..." rows={3} /></div>
    <div className="space-y-2"><Label htmlFor="internal_notes">Notas Internas</Label><Textarea id="internal_notes" value={form.internal_notes || ""}
      onChange={(event) => update("internal_notes", event.target.value)} placeholder="Notas visíveis apenas para a equipe..." rows={2} /></div>
  </div>;
}

function TemplateItemRow({ item, validation }: { item: QuoteTemplateItem; validation?: QuoteTemplateItemValidation }) {
  const invalid = validation?.isValid === false;
  const changed = Boolean(validation?.isValid && validation.currentPrice !== item.unitPrice);
  return <div className="flex items-center justify-between text-sm"><div className="flex flex-col flex-1">
    <span className={`truncate flex items-center gap-2 ${invalid ? "text-destructive line-through" : ""}`}>
      {item.quantity}x {item.productName}{invalid && <AlertTriangle className="h-3 w-3" />}</span>
    {changed && <span className="text-[10px] text-amber-600 font-medium">Preço no catálogo: {formatTemplateCurrency(validation?.currentPrice || 0)}</span>}
  </div><span className={`font-medium ml-4 ${changed ? "text-amber-600" : ""}`}>
    {formatTemplateCurrency(item.quantity * item.unitPrice)}</span></div>;
}

function TemplateItems({ form, validation }: { form: CreateTemplateInput; validation: QuoteTemplateItemValidation[] }) {
  if (!form.items_data?.length) return null;
  return <><Separator /><div className="space-y-3"><h4 className="font-medium">Itens do Template</h4>
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">{form.items_data.map((item, index) => <TemplateItemRow key={index} item={item}
      validation={validation.find((candidate) => candidate.productId === item.productId)} />)}
      <Separator className="my-2" /><div className="flex items-center justify-between font-medium"><span>Total Estimado</span>
        <span className="text-lg">{formatTemplateCurrency(templateTotal(form))}</span></div>
    </div></div></>;
}

function TemplateFormHeader({ editing }: { editing: boolean }) {
  return <CardHeader className="pb-4"><CardTitle>{editing ? "Editar Template" : "Novo Template"}</CardTitle>
    <CardDescription>{editing ? "Atualize as informações do template de orçamento"
      : "Crie um template reutilizável para agilizar seus orçamentos"}</CardDescription></CardHeader>;
}

function TemplateFormActions({ saving, editing, disabled, cancel }: {
  saving: boolean; editing: boolean; disabled: boolean; cancel?: () => void;
}) {
  return <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 border-t z-10">
    {cancel && <Button type="button" variant="outline" onClick={cancel}><X className="h-4 w-4 mr-2" />Cancelar</Button>}
    <Button type="submit" disabled={disabled} className="min-w-[140px]"><Save className="h-4 w-4 mr-2" />
      {saving ? "Salvando..." : editing ? "Salvar" : "Criar Template"}</Button>
  </div>;
}

export function QuoteTemplateForm({ template, initialItems = [], onSave, onCancel }: QuoteTemplateFormProps) {
  const { createTemplate, updateTemplate, validateTemplateItems } = useQuoteTemplates();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTemplateInput>(() => initialTemplateForm(template, initialItems));
  const validation = useTemplateValidation(form.items_data, validateTemplateItems);
  const update: UpdateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = template ? await updateTemplate(template.id, form) : await createTemplate(form);
      onSave?.(result);
    } finally { setSaving(false); }
  };
  const editing = Boolean(template);
  return <div className="grid gap-6 lg:grid-cols-2"><form onSubmit={submit} className="space-y-6">
    <Card><TemplateFormHeader editing={editing} /><CardContent className="space-y-6">
      <ValidationAlerts form={form} update={update} state={validation} />
      <BasicTemplateFields form={form} update={update} />
      <DiscountFields form={form} update={update} />
      <TermsFields form={form} update={update} />
      <NotesFields form={form} update={update} />
      <TemplateItems form={form} validation={validation.validation} />
    </CardContent></Card>
    <TemplateFormActions saving={saving} editing={editing} disabled={saving || !form.name.trim()} cancel={onCancel} />
  </form><div className="hidden lg:block"><div className="sticky top-6"><QuoteTemplatePreview data={form} /></div></div>
  <div className="lg:hidden"><Separator className="my-6" /><QuoteTemplatePreview data={form} /></div></div>;
}
