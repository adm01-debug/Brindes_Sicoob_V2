import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type QuoteTemplate, type QuoteTemplateItem, type CreateTemplateInput, useQuoteTemplates } from "@/hooks/useQuoteTemplates";
import { Save, X, Eye, FileEdit, AlertTriangle, RefreshCw } from "lucide-react";
import { QuoteTemplatePreview } from "./QuoteTemplatePreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface QuoteTemplateFormProps {
  template?: QuoteTemplate | null;
  initialItems?: QuoteTemplateItem[];
  onSave?: (template: QuoteTemplate | null) => void;
  onCancel?: () => void;
}

export function QuoteTemplateForm({
  template,
  initialItems = [],
  onSave,
  onCancel,
}: QuoteTemplateFormProps) {
  const { createTemplate, updateTemplate, validateTemplateItems } = useQuoteTemplates();
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [itemsValidation, setItemsValidation] = useState<any[]>([]);

  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: template?.name || "",
    description: template?.description || "",
    category: template?.category || "Geral",
    is_default: template?.is_default || false,
    items_data: template?.items_data || initialItems,
    discount_percent: template?.discount_percent || 0,
    discount_amount: template?.discount_amount || 0,
    notes: template?.notes || "",
    internal_notes: template?.internal_notes || "",
    payment_terms: template?.payment_terms || "",
    delivery_time: template?.delivery_time || "",
    validity_days: template?.validity_days || 30,
  });

  const isEditing = !!template;

  useEffect(() => {
    const validate = async () => {
      if (formData.items_data && formData.items_data.length > 0) {
        setValidating(true);
        const results = await validateTemplateItems(formData.items_data);
        setItemsValidation(results);
        setValidating(false);
      }
    };
    validate();
  }, [validateTemplateItems, template]); // Only run once or when template changes

  const hasInvalidItems = itemsValidation.some(item => item.isValid === false);
  const hasPriceChanges = itemsValidation.some(item => item.isValid && item.currentPrice !== item.unitPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    setSaving(true);
    try {
      let result;
      if (isEditing) {
        result = await updateTemplate(template.id, formData);
      } else {
        result = await createTemplate(formData);
      }
      onSave?.(result);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof CreateTemplateInput>(
    field: K,
    value: CreateTemplateInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateTotal = () => {
    const itemsTotal = (formData.items_data || []).reduce((sum, item) => {
      const itemBase = item.quantity * item.unitPrice;
      const personalizationCost = item.personalizations?.reduce((pSum, p) => {
        return pSum + (p.unitCost || 0) * item.quantity + (p.setupCost || 0);
      }, 0) || 0;
      return sum + itemBase + personalizationCost;
    }, 0);

    const discountValue = formData.discount_percent && formData.discount_percent > 0
      ? itemsTotal * (formData.discount_percent / 100)
      : formData.discount_amount || 0;

    return itemsTotal - discountValue;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isEditing ? "Editar Template" : "Novo Template"}</CardTitle>
                <CardDescription>
                  {isEditing 
                    ? "Atualize as informações do template de orçamento" 
                    : "Crie um template reutilizável para agilizar seus orçamentos"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
          {/* Validation Warnings */}
          {(hasInvalidItems || hasPriceChanges) && (
            <div className="space-y-3">
              {hasInvalidItems && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Produtos Indisponíveis</AlertTitle>
                  <AlertDescription>
                    Alguns itens deste template não foram encontrados no catálogo atual. Eles podem ter sido removidos.
                  </AlertDescription>
                </Alert>
              )}
              {hasPriceChanges && (
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  <AlertTitle>Alteração de Preços</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>Os preços de alguns produtos mudaram desde que o template foi criado.</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      onClick={(e) => {
                        e.preventDefault();
                        const updatedItems = (formData.items_data || []).map(item => {
                          const v = itemsValidation.find(iv => iv.productId === item.productId);
                          return v && v.isValid ? { ...item, unitPrice: v.currentPrice } : item;
                        });
                        updateField("items_data", updatedItems);
                        setItemsValidation(itemsValidation.map(v => ({ ...v, unitPrice: v.currentPrice })));
                      }}
                    >
                      Atualizar Preços
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Ex: Kits Corporativos Padrão"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category || ""}
                onChange={(e) => updateField("category", e.target.value)}
                placeholder="Ex: Kits, Eventos, Promocional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validity">Validade (dias)</Label>
              <Input
                id="validity"
                type="number"
                min={1}
                max={365}
                value={formData.validity_days || 30}
                onChange={(e) => updateField("validity_days", parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Descreva o template para facilitar a identificação..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Template Padrão</Label>
              <p className="text-sm text-muted-foreground">
                Será sugerido automaticamente ao criar novos orçamentos
              </p>
            </div>
            <Switch
              checked={formData.is_default}
              onCheckedChange={(checked) => updateField("is_default", checked)}
            />
          </div>

          <Separator />

          {/* Discount Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Configurações de Desconto</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount_percent">Desconto (%)</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.discount_percent || ""}
                  onChange={(e) => {
                    updateField("discount_percent", parseFloat(e.target.value) || 0);
                    if (e.target.value) updateField("discount_amount", 0);
                  }}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_amount">Desconto Fixo (R$)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.discount_amount || ""}
                  onChange={(e) => {
                    updateField("discount_amount", parseFloat(e.target.value) || 0);
                    if (e.target.value) updateField("discount_percent", 0);
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Terms */}
          <div className="space-y-4">
            <h4 className="font-medium">Termos e Condições</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Condições de Pagamento</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms || ""}
                  onChange={(e) => updateField("payment_terms", e.target.value)}
                  placeholder="Ex: 50% entrada + 50% na entrega"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_time">Prazo de Entrega</Label>
                <Input
                  id="delivery_time"
                  value={formData.delivery_time || ""}
                  onChange={(e) => updateField("delivery_time", e.target.value)}
                  placeholder="Ex: 15 dias úteis"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="font-medium">Observações</h4>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações para o Cliente</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Observações que aparecerão na proposta..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal_notes">Notas Internas</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes || ""}
                onChange={(e) => updateField("internal_notes", e.target.value)}
                placeholder="Notas visíveis apenas para a equipe..."
                rows={2}
              />
            </div>
          </div>

          {/* Items Summary */}
          {formData.items_data && formData.items_data.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Itens do Template</h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {(formData.items_data || []).map((item, index) => {
                    const validation = itemsValidation.find(v => v.productId === item.productId);
                    const isInvalid = validation?.isValid === false;
                    const priceChanged = validation?.isValid && validation.currentPrice !== item.unitPrice;
                    
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex flex-col flex-1">
                          <span className={`truncate flex items-center gap-2 ${isInvalid ? "text-destructive line-through" : ""}`}>
                            {item.quantity}x {item.productName}
                            {isInvalid && <AlertTriangle className="h-3 w-3" />}
                          </span>
                          {priceChanged && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              Preço no catálogo: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(validation.currentPrice)}
                            </span>
                          )}
                        </div>
                        <span className={`font-medium ml-4 ${priceChanged ? "text-amber-600" : ""}`}>
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    );
                  })}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Estimado</span>
                    <span className="text-lg">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </>
          )}
          </CardContent>
        </Card>
        
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 border-t z-10">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={saving || !formData.name.trim()} className="min-w-[140px]">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar Template"}
          </Button>
        </div>
      </form>

      <div className="hidden lg:block">
        <div className="sticky top-6">
          <QuoteTemplatePreview data={formData} />
        </div>
      </div>

      <div className="lg:hidden">
        <Separator className="my-6" />
        <QuoteTemplatePreview data={formData} />
      </div>
    </div>
  );
}
