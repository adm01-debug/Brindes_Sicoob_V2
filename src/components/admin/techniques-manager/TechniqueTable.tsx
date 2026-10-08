import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, Loader2, Palette, Droplets, Ruler, Hash } from "lucide-react";
import { InlineEditField } from "../InlineEditField";
import { buildTecnicaUpdatePayload } from "@/lib/personalization/adapters";
import type { PersonalizationTechniqueRaw } from "@/types/tecnica-unificada";

interface TecnicaRow {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string | null;
  custoSetup: number | null;
  custoManuseio: number | null;
  minCores: number | null;
  maxCores: number | null;
  quantidadeMinima: number | null;
  prazoEstimado: number | null;
  precoPorCor: boolean;
  precoPorArea: boolean;
  precoPorPontos: boolean;
  ativo: boolean;
}

interface TechniqueTableProps {
  tecnicas: TecnicaRow[];
  isLoading: boolean;
  isRemoving: boolean;
  onToggleStatus: (params: { id: string; ativo: boolean }) => void;
  onUpdate: (params: { id: string } & Partial<PersonalizationTechniqueRaw> & Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}

function getPricingBadges(tecnica: TecnicaRow) {
  const badges = [];
  if (tecnica.precoPorCor) badges.push({ label: 'Cor', icon: Droplets, color: 'bg-info/10 text-info' });
  if (tecnica.precoPorArea) badges.push({ label: 'Área', icon: Ruler, color: 'bg-success/10 text-success' });
  if (tecnica.precoPorPontos) badges.push({ label: 'Pontos', icon: Hash, color: 'bg-primary/10 text-primary' });
  return badges;
}

const numberText = (value: number | null): string => value?.toString() ?? "";
const nullableNumber = (value: string): number | null => value ? Number(value) : null;

function TechniqueRow({ tecnica, isRemoving, onToggleStatus, onUpdate, onRemove }: { tecnica: TecnicaRow } & Pick<TechniqueTableProps, "isRemoving" | "onToggleStatus" | "onUpdate" | "onRemove">) {
  const pricingBadges = getPricingBadges(tecnica);
  return (
    <TableRow>
      <TableCell><InlineEditField value={tecnica.codigo ?? ""} onSave={(value) => onUpdate({ id: tecnica.id, ...buildTecnicaUpdatePayload({ code: value.toUpperCase() }) })} placeholder="—" className="font-mono text-xs" /></TableCell>
      <TableCell><InlineEditField value={tecnica.nome} onSave={(value) => onUpdate({ id: tecnica.id, ...buildTecnicaUpdatePayload({ name: value }) })} /></TableCell>
      <TableCell><Badge variant="outline">{tecnica.categoria ?? '—'}</Badge></TableCell>
      <TableCell><div className="flex gap-1">{pricingBadges.map((badge) => <Badge key={badge.label} className={badge.color}><badge.icon className="h-3 w-3 mr-1" />{badge.label}</Badge>)}{pricingBadges.length === 0 && <span className="text-muted-foreground text-xs">—</span>}</div></TableCell>
      <TableCell><InlineEditField value={numberText(tecnica.custoSetup)} onSave={(value) => onUpdate({ id: tecnica.id, ...buildTecnicaUpdatePayload({ setup_price: nullableNumber(value) }) })} type="number" placeholder="—" /></TableCell>
      <TableCell><InlineEditField value={numberText(tecnica.custoManuseio)} onSave={(value) => onUpdate({ id: tecnica.id, ...buildTecnicaUpdatePayload({ handling_price: nullableNumber(value) }) })} type="number" placeholder="—" /></TableCell>
      <TableCell>{tecnica.maxCores ? <span className="text-sm">{tecnica.minCores ?? 1} - {tecnica.maxCores}</span> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
      <TableCell><InlineEditField value={numberText(tecnica.quantidadeMinima)} onSave={(value) => onUpdate({ id: tecnica.id, ...buildTecnicaUpdatePayload({ min_quantity: nullableNumber(value) }) })} type="number" placeholder="—" /></TableCell>
      <TableCell><InlineEditField value={numberText(tecnica.prazoEstimado)} onSave={(value) => onUpdate({ id: tecnica.id, ...buildTecnicaUpdatePayload({ estimated_days: nullableNumber(value) }) })} type="number" placeholder="—" /></TableCell>
      <TableCell className="text-center"><Switch checked={tecnica.ativo} onCheckedChange={(checked) => onToggleStatus({ id: tecnica.id, ativo: checked })} /></TableCell>
      <TableCell><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onRemove(tecnica.id)} disabled={isRemoving}><Trash2 className="h-4 w-4" /></Button></TableCell>
    </TableRow>
  );
}

export function TechniqueTable({ tecnicas, isLoading, isRemoving, onToggleStatus, onUpdate, onRemove }: TechniqueTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!tecnicas?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma técnica cadastrada no BD externo</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Código</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Tipo Preço</TableHead>
          <TableHead>Setup</TableHead>
          <TableHead>Manuseio</TableHead>
          <TableHead>Cores</TableHead>
          <TableHead>Qtd. Mín.</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tecnicas.map((tecnica) => (
          <TechniqueRow key={tecnica.id} tecnica={tecnica} isRemoving={isRemoving} onToggleStatus={onToggleStatus} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </TableBody>
    </Table>
  );
}
