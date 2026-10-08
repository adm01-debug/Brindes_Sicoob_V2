/**
 * ProductClassificationSection — Seção dedicada e visual para Classificação & Vínculos
 * Layout em grid de cards com ícones, badges de contagem e organização por categoria
 */
import { useState, type ElementType, type ReactNode } from 'react';
import { ProductVariantsSection } from '../ProductVariantsSection';
import { ProductVariationAxesConfig } from '../ProductVariationAxesConfig';
import { ProductMaterialsSection } from '../ProductMaterialsSection';
import { ProductTagsSection } from '../ProductTagsSection';
import { ProductRamosSection } from '../ProductRamosSection';
import { ProductMarketingSection } from '../ProductMarketingSection';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Layers,
  Palette,
  Tag,
  Building2,
  Megaphone,
  Settings2,
  Info,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  productId?: string;
  isEdit: boolean;
  productName: string;
  productSku: string;
  gender?: string;
  onGenderChange?: (value: string) => void;
}

interface ClassificationCardProps {
  title: string;
  subtitle: string;
  icon: ElementType;
  iconColor: string;
  children: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
}

function DisabledPlaceholder() {
  return (
    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground/60 italic">
      <Info className="h-3.5 w-3.5 shrink-0" />
      Disponível após salvar o produto
    </div>
  );
}

function ClassificationCard({ title, subtitle, icon, iconColor, children, defaultOpen = false, disabled = false }: ClassificationCardProps) {
  const Icon = icon;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn(
      "border-border/40 bg-card/60 overflow-hidden transition-all duration-200",
      disabled ? "opacity-60" : "hover:border-border/60"
    )}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-accent/30 transition-colors"
      >
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
          iconColor
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {disabled && (
          <Badge variant="outline" className="text-[10px] shrink-0 opacity-60">Salvar primeiro</Badge>
        )}
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-border/30">
          {children}
        </div>
      )}
    </Card>
  );
}

function ClassificationHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Layers className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-display text-base font-bold text-foreground">Classificação & Vínculos</h3>
        <p className="text-xs text-muted-foreground">Configure variações, materiais, tags e vínculos comerciais</p>
      </div>
    </div>
  );
}

interface ProductBoundCardProps {
  productId?: string;
  showFullContent: boolean;
  title: string;
  subtitle: string;
  icon: ElementType;
  iconColor: string;
  children: (id: string) => ReactNode;
}

function ProductBoundCard({
  productId,
  showFullContent,
  title,
  subtitle,
  icon,
  iconColor,
  children,
}: ProductBoundCardProps) {
  return (
    <ClassificationCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconColor={iconColor}
      defaultOpen={showFullContent && title === 'Variações de Cor'}
      disabled={!showFullContent}
    >
      {showFullContent && productId ? children(productId) : <DisabledPlaceholder />}
    </ClassificationCard>
  );
}

function ClassificationGrid({ productId, isEdit, productName, productSku, gender, onGenderChange }: Props) {
  const showFullContent = Boolean(isEdit && productId);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <ClassificationCard
        title="Eixos de Variação"
        subtitle="Gênero, cor, tamanho e capacidade"
        icon={Settings2}
        iconColor="bg-primary/10 text-primary"
        defaultOpen
      >
        <ProductVariationAxesConfig productId={productId || ''} gender={gender} onGenderChange={onGenderChange} />
      </ClassificationCard>
      <ProductBoundCard productId={productId} showFullContent={showFullContent} title="Variações de Cor" subtitle="Paleta de cores disponíveis" icon={Palette} iconColor="bg-primary/10 text-primary">
        {(id) => <ProductVariantsSection productId={id} productName={productName} productSku={productSku} />}
      </ProductBoundCard>
      <ProductBoundCard productId={productId} showFullContent={showFullContent} title="Materiais" subtitle="Composição e acabamento" icon={Sparkles} iconColor="bg-success/10 text-success">
        {(id) => <ProductMaterialsSection productId={id} />}
      </ProductBoundCard>
      <ProductBoundCard productId={productId} showFullContent={showFullContent} title="Tags" subtitle="Etiquetas de busca e filtro" icon={Tag} iconColor="bg-orange/10 text-orange">
        {(id) => <ProductTagsSection productId={id} />}
      </ProductBoundCard>
      <ProductBoundCard productId={productId} showFullContent={showFullContent} title="Ramos de Atividade" subtitle="Segmentos de mercado" icon={Building2} iconColor="bg-info/10 text-info">
        {(id) => <ProductRamosSection productId={id} />}
      </ProductBoundCard>
      <ProductBoundCard productId={productId} showFullContent={showFullContent} title="Marketing" subtitle="Público-alvo e endomarketing" icon={Megaphone} iconColor="bg-destructive/10 text-destructive">
        {(id) => <ProductMarketingSection productId={id} />}
      </ProductBoundCard>
    </div>
  );
}

export default function ProductClassificationSection(props: Props) {
  const showFullContent = Boolean(props.isEdit && props.productId);
  return (
    <div className="space-y-4">
      <ClassificationHeader />
      <ClassificationGrid {...props} />

      {!showFullContent && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground border border-border/30">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <span>Salve o produto primeiro para editar as classificações acima.</span>
        </div>
      )}
    </div>
  );
}
