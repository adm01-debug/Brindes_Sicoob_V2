import React, { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface OrganizationSwitcherProps {
  isCollapsed?: boolean;
}

type OrganizationContext = ReturnType<typeof useOrganization>;

function useCreateOrganization(createOrganization: OrganizationContext["createOrganization"]) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    try {
      const slug = newOrgName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const organization = await createOrganization(newOrgName, slug);
      if (!organization) throw new Error("Erro ao criar organização");
      toast({ title: "Organização criada!", description: `Você agora está na organização ${newOrgName}.` });
      setIsDialogOpen(false); setNewOrgName("");
    } catch {
      toast({ variant: "destructive", title: "Erro ao criar organização", description: "Ocorreu um problema. Tente novamente." });
    } finally {
      setIsCreating(false);
    }
  };
  return { isDialogOpen, setIsDialogOpen, newOrgName, setNewOrgName, isCreating, submit };
}

function OrganizationsList({ context }: { context: OrganizationContext }) {
  const { organizations, currentOrg, switchOrganization } = context;
  if (organizations.length === 0) return <div className="px-2 py-4 text-center text-[11px] text-muted-foreground italic">Nenhuma organização encontrada</div>;
  return <>{organizations.map((organization) => <DropdownMenuItem key={organization.id} onClick={() => switchOrganization(organization.id)} className="flex items-center gap-2 cursor-pointer focus:bg-sidebar-accent"><div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold">{organization.name.substring(0, 1)}</div><span className={cn("flex-1 truncate text-xs", currentOrg?.id === organization.id ? "font-bold text-primary" : "text-sidebar-foreground")}>{organization.name}</span>{currentOrg?.id === organization.id ? <Check className="h-3 w-3 text-primary" /> : null}</DropdownMenuItem>)}</>;
}

function OrganizationMenu({ context, isCollapsed, onCreate }: { context: OrganizationContext; isCollapsed: boolean; onCreate: () => void }) {
  const { currentOrg } = context;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className={cn("w-full justify-start gap-2 px-2 hover:bg-sidebar-accent/50 transition-colors", isCollapsed && "justify-center px-0")} title={isCollapsed ? currentOrg?.name : undefined}>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">{currentOrg?.logo_url ? <img src={currentOrg.logo_url} alt={currentOrg.name} className="h-4 w-4 rounded-sm object-cover" /> : <Building className="h-4 w-4" />}</div>
        {!isCollapsed ? <><span className="flex-1 truncate text-left text-xs font-medium text-sidebar-foreground">{currentOrg?.name || "Selecionar Org"}</span><ChevronsUpDown className="h-3 w-3 shrink-0 text-sidebar-foreground/30" /></> : null}
      </Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" side={isCollapsed ? "right" : "bottom"} className="w-56 bg-sidebar border-sidebar-border">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">Minhas Organizações</DropdownMenuLabel><DropdownMenuSeparator className="bg-sidebar-border/50" />
        <div className="max-h-[300px] overflow-y-auto"><OrganizationsList context={context} /></div>
        <DropdownMenuSeparator className="bg-sidebar-border/50" /><DropdownMenuItem className="flex items-center gap-2 cursor-pointer focus:bg-sidebar-accent text-primary" onClick={onCreate}><Plus className="h-3 w-3" /><span className="text-xs font-medium">Nova Organização</span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateOrganizationDialog({ state }: { state: ReturnType<typeof useCreateOrganization> }) {
  return (
    <Dialog open={state.isDialogOpen} onOpenChange={state.setIsDialogOpen}>
      <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Criar Organização</DialogTitle><DialogDescription>Crie uma nova organização para gerenciar seus produtos e orçamentos.</DialogDescription></DialogHeader>
        <form onSubmit={state.submit}><div className="grid gap-4 py-4"><div className="grid gap-2"><label htmlFor="name" className="text-sm font-medium">Nome da Organização</label><Input id="name" value={state.newOrgName} onChange={(event) => state.setNewOrgName(event.target.value)} placeholder="Ex: Minha Loja Store" autoFocus /></div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => state.setIsDialogOpen(false)} disabled={state.isCreating}>Cancelar</Button><Button type="submit" disabled={state.isCreating || !state.newOrgName.trim()}>{state.isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Organização"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationSwitcher({ isCollapsed = false }: OrganizationSwitcherProps) {
  const context = useOrganization();
  const createState = useCreateOrganization(context.createOrganization);

  if (context.isLoading) {
    return (
      <div className={cn("px-4 mb-2", isCollapsed && "px-2")}>
        <div className="h-10 w-full animate-pulse rounded-lg bg-sidebar-accent/50" />
      </div>
    );
  }

  return (
    <div className={cn("px-4 mb-4", isCollapsed && "px-2")}>
      <OrganizationMenu context={context} isCollapsed={isCollapsed} onCreate={() => createState.setIsDialogOpen(true)} />
      <CreateOrganizationDialog state={createState} />
    </div>
  );
}
