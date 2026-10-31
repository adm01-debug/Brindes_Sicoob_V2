import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, Palette, Ruler, MapPin, Layers, DollarSign, Package, Wrench, TrendingDown } from "lucide-react";


const QUANTITY_TIERS = [
  { min: 1, max: 9 },
  { min: 10, max: 24 },
  { min: 25, max: 49 },
  { min: 50, max: 99 },
  { min: 100, max: 249 },
  { min: 250, max: 499 },
  { min: 500, max: 999 },
  { min: 1000, max: null },
];

interface Personalization {
  technique_name?: string;
  technique_id?: string;
  colors_count?: number;
  width_cm?: number;
  height_cm?: number;
  area_cm2?: number;
  setup_cost?: number;
  unit_cost?: number;
  total_cost?: number;
  notes?: string;
  [key: string]: unknown;
}

interface QuoteItem {
  product_name: string;
  product_sku?: string | null;
  product_image_url?: string | null;
  color_name?: string | null;
  color_hex?: string | null;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  personalizations?: Personalization[];
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseNotesField(notes: string) {
  const [locationPart, dimPart] = notes.split(" | ");
  const locationSegments = locationPart?.split(" — ") || [];
  const location = locationSegments[0] || null;
  const code = locationSegments[1] || null;
  let dimensions: string | null = null;
  if (dimPart) {
    dimensions = dimPart.replace("cm", " cm");
  }
  return { location, code, dimensions };
}

function getNextTier(qty: number) {
  for (const tier of QUANTITY_TIERS) {
    if (tier.min > qty) {
      return tier;
    }
  }
  return null;
}

function getCurrentTierLabel(qty: number) {
  for (let i = QUANTITY_TIERS.length - 1; i >= 0; i--) {
    const t = QUANTITY_TIERS[i];
    if (t && qty >= t.min) {
      return t.max ? `${t.min}-${t.max}` : `${t.min}+`;
    }
  }
  return "1-9";
}

/** Component that fetches and shows next tier pricing */
function NextTierHint({ currentQty }: { currentQty: number }) {
  const nextTier = getNextTier(currentQty);

  if (!nextTier) return null;

  const unitsNeeded = nextTier.min - currentQty;
  const nextTierLabel = nextTier.max ? `${nextTier.min}-${nextTier.max}` : `${nextTier.min}+`;

  return (
    <div className="bg-accent/50 border border-accent rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <TrendingDown className="h-3.5 w-3.5 text-primary" />
        Próxima faixa de desconto
      </div>
      <div className="text-xs text-muted-foreground">
        Faltam <span className="font-bold text-foreground">{unitsNeeded} {unitsNeeded === 1 ? "unidade" : "unidades"}</span> para a faixa de{" "}
        <span className="font-bold text-foreground">{nextTierLabel} un</span>
      </div>
    </div>
  );
}

function personalizationUnitCost(personalization: Personalization, quantity: number): number {
  if (quantity <= 0) return 0;
  return Math.round(((personalization.total_cost || 0) / quantity) * 100) / 100;
}

function ProductSku({ item }: { item: QuoteItem }) {
  if (!item.product_sku) return null;
  return <span className="inline-flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded border mb-1"
      style={{ backgroundColor: item.color_hex ? `${item.color_hex}22` : undefined, borderColor: item.color_hex || 'hsl(var(--border))', color: item.color_hex || 'hsl(var(--foreground))' }}>
      {item.color_hex && <span className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: item.color_hex }} />}
      {item.product_sku}{item.color_name ? `-${item.color_name}` : ''}</span>;
}

function ProductColor({ item }: { item: QuoteItem }) {
  if (item.product_sku || !item.color_name) return null;
  return <div className="flex items-center gap-1.5 mt-1.5">{item.color_hex && <span
    className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: item.color_hex }} />}
    <span className="text-sm text-muted-foreground">{item.color_name}</span></div>;
}

function ProductInfo({ item }: { item: QuoteItem }) {
  return <div className="flex items-start gap-3">{item.product_image_url && <img src={item.product_image_url} alt={item.product_name}
    className="w-16 h-16 object-cover rounded-lg border border-border" loading="lazy" />}<div className="flex-1 min-w-0">
    <ProductSku item={item} />
    <p className="font-semibold text-foreground">{item.product_name}</p>
    <ProductColor item={item} />
  </div></div>;
}

function PricingSummary({ item, personalizations, allInUnit }: { item: QuoteItem; personalizations: Personalization[]; allInUnit: number }) {
  const personalizationUnit = personalizations.reduce((sum, personalization) => sum + personalizationUnitCost(personalization, item.quantity), 0);
  return <div><h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><DollarSign className="h-4 w-4 text-primary" />Preços</h4>
    <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Preço unitário (produto)</span><span className="font-medium">{fmt(item.unit_price)}</span></div>
      {personalizations.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Preço unitário (gravação)</span><span className="font-medium">{fmt(personalizationUnit)}</span></div>}
      <div className="flex justify-between font-semibold border-t border-border/50 pt-2"><span className="text-foreground">Unitário all-in</span><span className="text-primary">{fmt(allInUnit)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Quantidade</span><span className="font-medium">{item.quantity}
        <span className="text-xs text-muted-foreground ml-1.5">(faixa {getCurrentTierLabel(item.quantity)} un)</span></span></div>
      <div className="flex justify-between font-semibold border-t border-border/50 pt-2"><span className="text-foreground">Total do item</span>
        <span className="text-foreground">{fmt(Math.round(allInUnit * item.quantity * 100) / 100)}</span></div>
    </div>
  </div>;
}

function PersonalizationMetadata({ personalization }: { personalization: Personalization }) {
  const parsed = parseNotesField(personalization.notes || '');
  const dimensions = parsed.dimensions || (personalization.width_cm && personalization.height_cm ? `${personalization.width_cm}×${personalization.height_cm} cm` : null);
  return <div className="grid grid-cols-2 gap-2 text-xs">{parsed.location && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Local:</span><span className="font-medium text-foreground">{parsed.location}</span></div>}
      {parsed.code && <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Código:</span><span className="font-mono font-medium text-foreground">{parsed.code}</span></div>}
      {dimensions && <div className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Tamanho:</span><span className="font-medium text-foreground">{dimensions}</span></div>}
      <div className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Cores:</span>
        <span className="font-medium text-foreground">{personalization.colors_count || 1}</span></div>
      {personalization.area_cm2 && <div className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Área:</span><span className="font-medium text-foreground">{personalization.area_cm2} cm²</span></div>}
    </div>;
}

function PersonalizationDetail({ personalization, quantity }: { personalization: Personalization; quantity: number }) {
  const unit = personalizationUnitCost(personalization, quantity);
  const total = Math.round(unit * quantity * 100) / 100;
  return <div className="space-y-3"><div className="bg-muted/50 rounded-lg p-3 space-y-2.5 border border-border/50">
    <div className="flex items-center gap-2"><Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">✦ {personalization.technique_name || 'Gravação'}</Badge></div>
    <PersonalizationMetadata personalization={personalization} /><Separator className="my-1" /><div className="grid grid-cols-3 gap-2 text-xs">
      <div><span className="text-muted-foreground block">Unitário</span><span className="font-semibold text-foreground">{fmt(unit)}</span></div>
      <div><span className="text-muted-foreground block">Setup</span><span className="font-semibold text-foreground">{fmt(personalization.setup_cost || 0)}</span></div>
      <div><span className="text-muted-foreground block">Total</span><span className="font-semibold text-primary">{fmt(total)}</span></div>
    </div></div><NextTierHint currentQty={quantity} /></div>;
}

function PersonalizationDetails({ personalizations, quantity }: { personalizations: Personalization[]; quantity: number }) {
  if (personalizations.length === 0) return null;
  return <><Separator /><div><h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Wrench className="h-4 w-4 text-primary" />
    Personalização ({personalizations.length})</h4><div className="space-y-4">{personalizations.map((personalization, index) =>
      <PersonalizationDetail key={`${personalization.technique_id || personalization.technique_name}-${index}`} personalization={personalization} quantity={quantity} />)}</div></div></>;
}

function ItemNotes({ notes }: { notes: string | null | undefined }) {
  if (!notes || notes.includes('|||')) return null;
  return <><Separator /><div><h4 className="text-sm font-semibold text-foreground mb-2">Observações</h4><p className="text-sm text-muted-foreground">{notes}</p></div></>;
}

export function QuoteItemDetailSheet({ item }: { item: QuoteItem }) {
  const personalizations = item.personalizations || [];
  const allInUnit = item.unit_price + personalizations.reduce((sum, p) => {
    return sum + personalizationUnitCost(p, item.quantity);
  }, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 h-7 px-2 font-semibold">
          <Info className="h-3.5 w-3.5" />
          Detalhes
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Detalhes do Item</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <ProductInfo item={item} />
          <Separator />
          <PricingSummary item={item} personalizations={personalizations} allInUnit={allInUnit} />
          <PersonalizationDetails personalizations={personalizations} quantity={item.quantity} />
          <ItemNotes notes={item.notes} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
