/**
 * ProductPersonalizationManager — Orchestrator component.
 * Logic extracted to usePersonalizationManager hook.
 * UI sections extracted to sub-components.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Loader2, Layers } from "lucide-react";
import { usePersonalizationManager } from "./usePersonalizationManager";
import { ProductSelector } from "./ProductSelector";
import { GroupInheritanceSection } from "./GroupInheritanceSection";
import { ComponentAccordionItem } from "./ComponentAccordionItem";

type PersonalizationManager = ReturnType<typeof usePersonalizationManager>;

function RulesLoadError({ manager }: { manager: PersonalizationManager }) {
  if (!manager.locationsError && !manager.locationTechniquesError) return null;
  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      Não foi possível carregar as regras de personalização. Verifique o acesso ao banco e tente novamente.
    </div>
  );
}

function InheritedGroupRules({ manager }: { manager: PersonalizationManager }) {
  if (!manager.selectedProduct || !manager.hasGroup || !manager.productMembership) return null;
  return (
    <GroupInheritanceSection
      productMembership={manager.productMembership}
      isUsingGroupRules={manager.isUsingGroupRules}
      isCopying={manager.isCopying}
      copyGroupRulesToProduct={manager.copyGroupRulesToProduct}
      toggleGroupRules={(product) => manager.toggleGroupRulesMutation.mutate(product)}
    />
  );
}

function AddComponentDialog({ manager }: { manager: PersonalizationManager }) {
  return (
    <Dialog open={manager.isAddComponentOpen} onOpenChange={manager.setIsAddComponentOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Componente</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Componente</DialogTitle><DialogDescription>Adicione um componente personalizável ao produto</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>Código</Label><Input placeholder="Ex: CORPO, TAMPA" value={manager.newComponent.code} onChange={(event) => manager.setNewComponent({ ...manager.newComponent, code: event.target.value })} /></div>
          <div><Label>Nome</Label><Input placeholder="Ex: Corpo, Tampa" value={manager.newComponent.name} onChange={(event) => manager.setNewComponent({ ...manager.newComponent, name: event.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => manager.setIsAddComponentOpen(false)}>Cancelar</Button>
          <Button onClick={manager.handleAddComponent} disabled={manager.addComponentMutation.isPending}>
            {manager.addComponentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyComponents() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Nenhum componente configurado</p>
      <p className="text-sm">Adicione componentes para definir as áreas de personalização</p>
    </div>
  );
}

function ComponentsList({ manager }: { manager: PersonalizationManager }) {
  const selectedProduct = manager.selectedProduct;
  if (manager.componentsLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!manager.components?.length) {
    return <EmptyComponents />;
  }
  if (!selectedProduct) return null;

  return (
    <DndContext sensors={manager.sensors} collisionDetection={closestCenter} onDragEnd={manager.handleComponentDragEnd}>
      <SortableContext items={manager.components.map((component) => component.id)} strategy={verticalListSortingStrategy}>
        <Accordion type="multiple" className="space-y-2">
          {manager.components.map((component) => (
            <ComponentAccordionItem
              key={component.id}
              component={component}
              selectedProduct={selectedProduct}
              locations={manager.getLocationsForComponent(component.id)}
              techniques={manager.techniques}
              locationTechniques={manager.locationTechniques || []}
              isAddLocationOpen={manager.isAddLocationOpen} setIsAddLocationOpen={manager.setIsAddLocationOpen}
              selectedComponentId={manager.selectedComponentId} setSelectedComponentId={manager.setSelectedComponentId}
              isAddTechniqueOpen={manager.isAddTechniqueOpen} setIsAddTechniqueOpen={manager.setIsAddTechniqueOpen}
              selectedLocationId={manager.selectedLocationId} setSelectedLocationId={manager.setSelectedLocationId}
              newLocation={manager.newLocation} setNewLocation={manager.setNewLocation}
              newTechniqueId={manager.newTechniqueId} setNewTechniqueId={manager.setNewTechniqueId}
              newMaxColors={manager.newMaxColors} setNewMaxColors={manager.setNewMaxColors}
              updateComponent={(payload) => manager.updateComponentMutation.mutate(payload as Parameters<typeof manager.updateComponentMutation.mutate>[0])}
              deleteComponent={(id) => manager.deleteComponentMutation.mutate(id)}
              handleAddLocation={manager.handleAddLocation}
              addLocationPending={manager.addLocationMutation.isPending}
              updateLocation={(payload) => manager.updateLocationMutation.mutate(payload as Parameters<typeof manager.updateLocationMutation.mutate>[0])}
              deleteLocation={(id) => manager.deleteLocationMutation.mutate(id)}
              handleAddTechnique={manager.handleAddTechnique}
              addTechniquePending={manager.addTechniqueMutation.isPending}
              updateTechnique={(payload) => manager.updateTechniqueMutation.mutate(payload as Parameters<typeof manager.updateTechniqueMutation.mutate>[0])}
              deleteTechnique={(id) => manager.deleteTechniqueMutation.mutate(id)}
            />
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
}

function ComponentsManagement({ manager }: { manager: PersonalizationManager }) {
  if (!manager.selectedProduct || (manager.hasGroup && manager.isUsingGroupRules)) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Componentes do Produto</CardTitle>
            <CardDescription>{manager.hasGroup ? "Regras customizadas para este produto" : "Configure as áreas de personalização"}</CardDescription>
          </div>
          <AddComponentDialog manager={manager} />
        </div>
      </CardHeader>
      <CardContent><ComponentsList manager={manager} /></CardContent>
    </Card>
  );
}

export function ProductPersonalizationManager() {
  const m = usePersonalizationManager();

  return (
    <div className="space-y-6">
      <RulesLoadError manager={m} />
      {/* Product Selector */}
      {(<ProductSelector
        searchQuery={m.searchQuery} setSearchQuery={m.setSearchQuery}
        selectedProduct={m.selectedProduct} setSelectedProduct={m.setSelectedProduct}
        productsLoading={m.productsLoading} filteredProducts={m.filteredProducts}
        totalProducts={m.products?.length || 0}
        allMemberships={m.allMemberships} productGroups={m.productGroups}
      />)}

      {/* Group Inheritance */}
      <InheritedGroupRules manager={m} />

      {/* Components Management */}
      <ComponentsManagement manager={m} />
    </div>
  );
}
