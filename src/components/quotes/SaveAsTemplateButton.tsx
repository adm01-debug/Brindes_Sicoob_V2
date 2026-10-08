import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, BookTemplate, Loader2 } from "lucide-react";
import { useQuoteTemplates, type QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import type { QuoteItem } from "@/hooks/quotes/quoteTypes";
import { toast } from "sonner";

interface SaveAsTemplateButtonProps {
  quoteData: {
    items: QuoteItem[];
    discount_percent?: number;
    payment_terms?: string;
    delivery_time?: string;
    notes?: string;
  };
  trigger?: React.ReactNode;
}

function toTemplateItems(items: QuoteItem[]): QuoteTemplateItem[] {
  return items.map((item) => ({
    productId: item.product_id, productName: item.product_name, productSku: item.product_sku,
    productImageUrl: item.product_image_url, quantity: item.quantity, unitPrice: item.unit_price,
    colorName: item.color_name, colorHex: item.color_hex,
    personalizations: item.personalizations?.map((personalization) => ({
      techniqueId: personalization.technique_id, techniqueName: personalization.technique_name,
      colorsCount: personalization.colors_count, positionsCount: personalization.positions_count,
      unitCost: personalization.unit_cost, setupCost: personalization.setup_cost,
    })),
  }));
}

function TemplateFields({ name, setName, description, setDescription, isPublic, setIsPublic }: {
  name: string; setName: (value: string) => void; description: string; setDescription: (value: string) => void;
  isPublic: boolean; setIsPublic: (value: boolean) => void;
}) {
  return <div className="grid gap-4 py-4"><div className="grid gap-2"><Label htmlFor="name">Nome do Template</Label>
    <Input id="name" placeholder="Ex: Brindes de Final de Ano" value={name} onChange={(event) => setName(event.target.value)} /></div>
    <div className="grid gap-2"><Label htmlFor="description">Descrição (Opcional)</Label>
      <Textarea id="description" placeholder="Descreva para que serve este modelo..." value={description}
        onChange={(event) => setDescription(event.target.value)} className="resize-none h-20" /></div>
    <div className="flex items-center justify-between space-x-2"><Label htmlFor="public" className="flex flex-col gap-1">
      <span>Template Público</span><span className="font-normal text-xs text-muted-foreground">Outros vendedores da empresa poderão usar este modelo.</span>
    </Label><Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} /></div>
  </div>;
}

function useSaveTemplate(quoteData: SaveAsTemplateButtonProps["quoteData"]) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const { createTemplate } = useQuoteTemplates();
  const save = async () => {
    if (!name.trim()) { toast.error("O nome do template é obrigatório"); return; }
    setIsSaving(true);
    try {
      const success = await createTemplate({ name, description, is_public: isPublic, items_data: toTemplateItems(quoteData.items),
        discount_percent: quoteData.discount_percent || 0, payment_terms: quoteData.payment_terms,
        delivery_time: quoteData.delivery_time, notes: quoteData.notes });
      if (success) { setOpen(false); setName(""); setDescription(""); }
    } finally { setIsSaving(false); }
  };
  return { open, setOpen, isSaving, name, setName, description, setDescription, isPublic, setIsPublic, save };
}

export function SaveAsTemplateButton({ quoteData, trigger }: SaveAsTemplateButtonProps) {
  const controller = useSaveTemplate(quoteData);

  return (
    <Dialog open={controller.open} onOpenChange={controller.setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <BookTemplate className="h-4 w-4" />
            Salvar como Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Transforme este orçamento em um modelo para reutilizar futuramente.
          </DialogDescription>
        </DialogHeader>
        <TemplateFields name={controller.name} setName={controller.setName} description={controller.description} setDescription={controller.setDescription}
          isPublic={controller.isPublic} setIsPublic={controller.setIsPublic} />
        <DialogFooter>
          <Button variant="outline" onClick={() => controller.setOpen(false)} disabled={controller.isSaving}>
            Cancelar
          </Button>
          <Button onClick={controller.save} disabled={controller.isSaving} className="gap-2">
            {controller.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
