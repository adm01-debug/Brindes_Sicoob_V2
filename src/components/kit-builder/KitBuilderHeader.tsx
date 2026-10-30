import type { ComponentType } from "react";
/**
 * Kit Builder Header — 2-tier premium layout
 * Tier 1: Identity (name + status badges) — stripe + colored icon refletem identidade
 * Tier 2: Primary actions (Save, New, Library)
 */
import {
  Save, Cloud, Loader2, RotateCcw, Undo2, Redo2, Check, Library, Sparkles,
} from 'lucide-react';
import * as Lucide from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BackButton } from '@/components/common/BackButton';
import { KitAIPromptDialog } from '@/components/kit-builder/KitAIPromptDialog';
import { KitIdentityPicker } from '@/components/kit-builder/KitIdentityPicker';
import { KitShareLinkDialog } from '@/components/kit-builder/KitShareLinkDialog';
import { useRBAC } from '@/hooks/useRBAC';
import { useTemplateSnapshot } from '@/hooks/useTemplateSnapshot';
import type { KitIdentity, KitState } from '@/lib/kit-builder';
import { cn } from '@/lib/utils';

interface KitBuilderHeaderProps {
  kitName: string;
  onKitNameChange: (name: string) => void;
  isValid: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  lastSavedAt: Date | null;
  autoSaveError?: string | null;
  onRetryAutoSave?: () => void;
  hasContent: boolean;
  isExistingKit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  identity?: KitIdentity;
  onIdentityChange: (next: KitIdentity) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onAIApply: (s: { kit_type: 'montado' | 'original' | 'simples'; box_keywords: string[] }) => void;
  /** Full kit state — used by admin "Save as system template" snapshot. */
  kitState?: KitState;
  /** When set, header indicates we are editing a system template (admin mode). */
  templateId?: string;
  /** Saved kit ID — enables share link dialog. */
  currentKitId?: string;
}

function SaveStatus({ props }: { props: KitBuilderHeaderProps }) {
  if (props.isAutoSaving) return <Badge variant="outline" className="text-[10px] gap-1 h-5"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Salvando…</Badge>;
  if (props.autoSaveError) return <Button variant="outline" size="sm" className="h-5 px-1.5 text-[10px] text-destructive" onClick={props.onRetryAutoSave}>Falha ao salvar — tentar novamente</Button>;
  if (props.lastSavedAt) return <Badge variant="outline" className="text-[10px] gap-1 h-5 border-success/40 text-success"><Cloud className="h-2.5 w-2.5" />Salvo {props.lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Badge>;
  return null;
}

function KitStatus({ props }: { props: KitBuilderHeaderProps }) {
  return <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap"><span>Kit Maker</span>
    {props.templateId ? <Badge className="text-[10px] gap-1 h-5 bg-primary/15 text-primary border-primary/30"><Sparkles className="h-2.5 w-2.5" /> Editando template do sistema</Badge> : null}
    {props.identity?.tag ? <Badge variant="secondary" className="text-[10px] h-5">{props.identity.tag}</Badge> : null}
    <SaveStatus props={props} />
    {props.isValid && props.hasContent && !props.isAutoSaving ? <Badge className="text-[10px] gap-1 h-5 bg-success/15 text-success border-success/30 hover:bg-success/20">✓ Kit válido</Badge> : null}
  </div>;
}

function HistoryActions({ props }: { props: KitBuilderHeaderProps }) {
  return <><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Desfazer" disabled={!props.canUndo} onClick={props.onUndo}><Undo2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Desfazer (Ctrl+Z)</TooltipContent></Tooltip></TooltipProvider><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Refazer" disabled={!props.canRedo} onClick={props.onRedo}><Redo2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Refazer (Ctrl+Y)</TooltipContent></Tooltip></TooltipProvider></>;
}

function TemplateAction({ props }: { props: KitBuilderHeaderProps }) {
  const { isAdmin } = useRBAC();
  const { saveAsTemplate, isSavingTemplate } = useTemplateSnapshot();
  const kitState = props.kitState;
  if (!isAdmin || !kitState || !props.hasContent) return null;
  const label = props.templateId ? "Atualizar template" : "Salvar como template";
  const tooltip = props.templateId ? "Atualizar template do sistema" : "Salvar este kit como template do sistema (admin)";
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" onClick={() => saveAsTemplate({ kitState, templateId: props.templateId })} disabled={isSavingTemplate} className="gap-2 border-primary/40 text-primary hover:bg-primary/10" aria-label="Salvar como template do sistema">{isSavingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}<span className="hidden md:inline">{label}</span></Button></TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip></TooltipProvider>;
}

function KitActions({ props }: { props: KitBuilderHeaderProps }) {
  const navigate = useNavigate();
  const SaveIcon = props.isSaving ? Loader2 : props.lastSavedAt && !props.isAutoSaving ? Check : Save;
  return <div className="flex items-center gap-2 shrink-0"><HistoryActions props={props} /><KitIdentityPicker identity={props.identity} onChange={props.onIdentityChange} /><KitShareLinkDialog kitId={props.currentKitId} kitName={props.kitName} />
    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" onClick={() => navigate("/meus-kits")} className="gap-2" aria-label="Abrir biblioteca de kits"><Library className="h-4 w-4" /><span className="hidden md:inline">Biblioteca</span></Button></TooltipTrigger><TooltipContent>Abrir biblioteca de kits</TooltipContent></Tooltip></TooltipProvider>
    <TemplateAction props={props} /><Button variant={props.isValid && props.hasContent ? "default" : "outline"} onClick={props.onSave} disabled={props.isSaving || !props.hasContent} className="font-medium"><SaveIcon className={cn("h-4 w-4 mr-2", props.isSaving && "animate-spin")} />{props.isExistingKit ? "Atualizar" : "Salvar"}</Button><Button variant="outline" onClick={props.onReset} className="font-medium text-destructive hover:text-destructive"><RotateCcw className="h-4 w-4 mr-2" /> Novo kit</Button><div className="hidden lg:block"><KitAIPromptDialog onApply={props.onAIApply} /></div>
  </div>;
}

export function KitBuilderHeader(props: KitBuilderHeaderProps) {
  const identityColor = props.identity?.color || '#3B82F6';
  const identityIconName = props.identity?.icon || 'Package';
  const IdentityIcon =
    (Lucide as unknown as Record<string, ComponentType<{ className?: string; strokeWidth?: number }>>)[identityIconName] ||
    Lucide.Package;

  return (
    <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-30">
      {/* Identity color stripe */}
      <div
        className="h-1 w-full transition-colors"
        style={{ background: identityColor }}
        aria-hidden
      />
      <div className="container py-3">
        <BackButton fallbackPath="/meus-kits" className="mb-2" />

        {/* TIER 1 — Identity */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-colors"
            style={{
              background: `${identityColor}1A`,
              borderColor: `${identityColor}40`,
              color: identityColor,
            }}
          >
            <IdentityIcon className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={props.kitName}
              onChange={(e) => props.onKitNameChange(e.target.value)}
              placeholder="Kit sem nome"
              aria-label="Nome do kit"
              className={cn(
                'font-display font-bold text-2xl tracking-tight border-0 px-0 h-auto py-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                !props.kitName && 'italic text-muted-foreground',
              )}
            />
            <KitStatus props={props} />
          </div>
          <KitActions props={props} />
        </div>
      </div>
    </header>
  );
}
