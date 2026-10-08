import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Droplets, Ruler, Hash, Clock, Package } from "lucide-react";

interface NewTechniqueData {
  code: string;
  name: string;
  description: string;
  category: string;
  setupPrice: string;
  handlingPrice: string;
  minColors: string;
  maxColors: string;
  minQuantity: string;
  estimatedDays: string;
  priceByColor: boolean;
  priceByArea: boolean;
  priceByStitches: boolean;
  displayOrder: string;
}

const EMPTY_FORM: NewTechniqueData = {
  code: "", name: "", description: "", category: "",
  setupPrice: "", handlingPrice: "", minColors: "", maxColors: "",
  minQuantity: "", estimatedDays: "", priceByColor: false,
  priceByArea: false, priceByStitches: false, displayOrder: "",
};

const optionalNumber = (value: string): number | undefined => value ? Number(value) : undefined;

function techniquePayload(form: NewTechniqueData) {
  return {
    code: form.code.toUpperCase(), name: form.name, description: form.description || undefined,
    category: form.category || 'Outros', setup_price: optionalNumber(form.setupPrice),
    handling_price: optionalNumber(form.handlingPrice), min_colors: optionalNumber(form.minColors) ?? 1,
    max_colors: optionalNumber(form.maxColors), min_quantity: optionalNumber(form.minQuantity),
    estimated_days: optionalNumber(form.estimatedDays), price_by_color: form.priceByColor,
    price_by_area: form.priceByArea, price_by_stitches: form.priceByStitches,
    display_order: optionalNumber(form.displayOrder) ?? 0, is_active: true,
    requires_color_count: form.priceByColor || Boolean(form.maxColors),
  };
}

interface TechniqueFormDialogProps {
  categorias: string[];
  isCreating: boolean;
  onCreate: (data: {
    code: string; name: string; description?: string; category: string;
    setup_price?: number; handling_price?: number;
    min_colors: number; max_colors?: number; min_quantity?: number;
    estimated_days?: number; price_by_color: boolean;
    price_by_area: boolean; price_by_stitches: boolean;
    display_order: number; is_active: boolean; requires_color_count: boolean;
  }) => void;
}

type UpdateTechnique = (field: keyof NewTechniqueData, value: string | boolean) => void;

function TechniqueIdentityFields({ form, categorias, update }: { form: NewTechniqueData; categorias: string[]; update: UpdateTechnique }) {
  return <><div className="grid grid-cols-2 gap-4"><div><Label>Código *</Label><Input placeholder="Ex: SERI, LASER" value={form.code} onChange={event => update("code", event.target.value)} /></div><div><Label>Nome *</Label><Input placeholder="Ex: Serigrafia" value={form.name} onChange={event => update("name", event.target.value)} /></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Categoria</Label><Select value={form.category} onValueChange={value => update("category", value)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{categorias.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}<SelectItem value="Outros">Outros</SelectItem></SelectContent></Select></div><div><Label>Ordem de Exibição</Label><Input type="number" placeholder="0" value={form.displayOrder} onChange={event => update("displayOrder", event.target.value)} /></div></div><div><Label>Descrição</Label><Textarea placeholder="Descrição da técnica..." value={form.description} onChange={event => update("description", event.target.value)} /></div></>;
}

function TechniqueNumericFields({ form, update }: { form: NewTechniqueData; update: UpdateTechnique }) {
  return <><div className="grid grid-cols-2 gap-4"><div><Label>Custo de Setup (R$)</Label><Input type="number" step="0.01" placeholder="0.00" value={form.setupPrice} onChange={event => update("setupPrice", event.target.value)} /></div><div><Label>Custo de Manuseio (R$)</Label><Input type="number" step="0.01" placeholder="0.00" value={form.handlingPrice} onChange={event => update("handlingPrice", event.target.value)} /></div></div><div className="grid grid-cols-2 gap-4"><div><Label>Mín. Cores</Label><Input type="number" placeholder="1" value={form.minColors} onChange={event => update("minColors", event.target.value)} /></div><div><Label>Máx. Cores</Label><Input type="number" placeholder="Ilimitado" value={form.maxColors} onChange={event => update("maxColors", event.target.value)} /></div></div><div className="grid grid-cols-2 gap-4"><div><Label className="flex items-center gap-1"><Package className="h-3 w-3" />Qtd. Mínima</Label><Input type="number" placeholder="Ex: 50" value={form.minQuantity} onChange={event => update("minQuantity", event.target.value)} /></div><div><Label className="flex items-center gap-1"><Clock className="h-3 w-3" />Prazo (dias úteis)</Label><Input type="number" placeholder="Ex: 7" value={form.estimatedDays} onChange={event => update("estimatedDays", event.target.value)} /></div></div></>;
}

function PricingTypeFields({ form, update }: { form: NewTechniqueData; update: UpdateTechnique }) {
  return <div className="space-y-3 pt-2 border-t"><Label className="text-base">Tipo de Precificação</Label><div className="grid grid-cols-3 gap-4"><div className="flex items-center justify-between p-3 rounded-lg border"><div className="flex items-center gap-2"><Droplets className="h-4 w-4 text-info" /><span className="text-sm">Por Cor</span></div><Switch checked={form.priceByColor} onCheckedChange={checked => update("priceByColor", checked)} /></div><div className="flex items-center justify-between p-3 rounded-lg border"><div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-success" /><span className="text-sm">Por Área</span></div><Switch checked={form.priceByArea} onCheckedChange={checked => update("priceByArea", checked)} /></div><div className="flex items-center justify-between p-3 rounded-lg border"><div className="flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /><span className="text-sm">Por Pontos</span></div><Switch checked={form.priceByStitches} onCheckedChange={checked => update("priceByStitches", checked)} /></div></div></div>;
}

export function TechniqueFormDialog({ categorias, isCreating, onCreate }: TechniqueFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<NewTechniqueData>(EMPTY_FORM);

  const handleAdd = () => {
    if ((!form.name || !form.code)) return;
    onCreate(techniquePayload(form));
    setIsOpen(false);
    setForm(EMPTY_FORM);
  };

  const update = (field: keyof NewTechniqueData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Nova Técnica</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Técnica de Personalização</DialogTitle>
          <DialogDescription>Adicione uma nova técnica ao catálogo (BD Externo)</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <TechniqueIdentityFields form={form} categorias={categorias} update={update} />
          <TechniqueNumericFields form={form} update={update} />
          <PricingTypeFields form={form} update={update} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={isCreating || !form.code || !form.name}>
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Técnica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
