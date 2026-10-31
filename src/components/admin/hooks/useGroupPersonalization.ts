import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import { invokeExternalDb } from "@/lib/external-db";
import { toast } from "sonner";

const GROUP_COMPONENTS_KEY = "group-components";
const GROUP_LOCATIONS_KEY = "group-locations";
const GROUP_LOCATION_TECHNIQUES_KEY = "group-location-techniques";

export type UpdateData = { id: string; [key: string]: string | number | boolean | null | undefined };

export interface ProductGroup {
  id: string;
  group_code: string;
  group_name: string;
}

export interface GroupComponent {
  id: string;
  product_group_id: string;
  component_code: string;
  component_name: string;
  is_personalizable: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface GroupLocation {
  id: string;
  group_component_id: string;
  location_code: string;
  location_name: string;
  max_width_cm: number | null;
  max_height_cm: number | null;
  max_area_cm2: number | null;
  area_image_url: string | null;
  is_active: boolean;
}

export interface Technique {
  id: string;
  code: string;
  name: string;
}

export interface GroupLocationTechnique {
  id: string;
  group_location_id: string;
  technique_id: string;
  technique_code: string;
  max_colors: number | null;
  is_default: boolean;
  is_active: boolean;
  technique?: Technique;
}

export function useGroupPersonalization() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["product-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select("id, group_code, group_name")
        .eq("is_active", true)
        .order("group_name");
      if (error) throw error;
      return data as ProductGroup[];
    },
  });

  const { data: components, isLoading: componentsLoading, error: componentsError } = useQuery({
    queryKey: [GROUP_COMPONENTS_KEY, selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const { data, error } = await untypedFrom<GroupComponent>("product_group_components")
          .select("*")
          .eq("product_group_id", selectedGroup)
          .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedGroup,
  });

  const { data: locations, error: locationsError } = useQuery({
    queryKey: [GROUP_LOCATIONS_KEY, selectedGroup],
    queryFn: async () => {
      if (!components?.length) return [];
      const componentIds = components.map((c) => c.id);
      const { data, error } = await untypedFrom<GroupLocation>("product_group_locations")
          .select("*")
          .in("group_component_id", componentIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!components?.length,
  });

  const { data: techniques } = useQuery({
    queryKey: ["techniques-external"],
    queryFn: async () => {
      const result = await invokeExternalDb<Technique>({
        table: "personalization_techniques",
        operation: "select",
        select: "id, code, name",
        filters: { is_active: true },
        orderBy: { column: "name", ascending: true },
        limit: 100,
      });
      return result.records;
    },
  });

  const { data: locationTechniques, error: locationTechniquesError } = useQuery({
    queryKey: [GROUP_LOCATION_TECHNIQUES_KEY, selectedGroup],
    queryFn: async () => {
      if (!locations?.length) return [];
      const locationIds = locations.map((l) => l.id);
      const { data, error } = await untypedFrom<GroupLocationTechnique>("product_group_location_techniques")
          .select("*")
          .in("group_location_id", locationIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!locations?.length,
  });

  // Mutations
  const addComponent = useMutation({
    mutationFn: async (data: { product_group_id: string; component_code: string; component_name: string }) => {
      const { error } = await untypedFrom<GroupComponent>("product_group_components").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_COMPONENTS_KEY] });
      toast.success("Componente adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar componente"),
  });

  const updateComponent = useMutation({
    mutationFn: async ({ id, ...data }: UpdateData) => {
      const { error } = await untypedFrom<GroupComponent>("product_group_components").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [GROUP_COMPONENTS_KEY] }),
    onError: () => toast.error("Erro ao atualizar componente"),
  });

  const deleteComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untypedFrom<GroupComponent>("product_group_components").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_COMPONENTS_KEY] });
      toast.success("Componente removido!");
    },
    onError: () => toast.error("Erro ao remover componente"),
  });

  const addLocation = useMutation({
    mutationFn: async (data: { group_component_id: string; location_code: string; location_name: string; max_width_cm?: number; max_height_cm?: number; max_area_cm2?: number }) => {
      const { error } = await untypedFrom<GroupLocation>("product_group_locations").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_LOCATIONS_KEY] });
      toast.success("Localização adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar localização"),
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, ...data }: UpdateData) => {
      const { error } = await untypedFrom<GroupLocation>("product_group_locations").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_LOCATIONS_KEY] });
      toast.success("Localização atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar localização"),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untypedFrom<GroupLocation>("product_group_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_LOCATIONS_KEY] });
      toast.success("Localização removida!");
    },
    onError: () => toast.error("Erro ao remover localização"),
  });

  const addTechnique = useMutation({
    mutationFn: async (data: { group_location_id: string; technique_id: string; max_colors?: number }) => {
      const technique = techniques?.find((item) => item.id === data.technique_id);
      if (!technique?.code) throw new Error("Técnica externa indisponível");
      const { error } = await untypedFrom<GroupLocationTechnique>("product_group_location_techniques")
        .insert({ ...data, technique_code: technique.code });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_LOCATION_TECHNIQUES_KEY] });
      toast.success("Técnica associada!");
    },
    onError: () => toast.error("Erro ao associar técnica"),
  });

  const updateTechnique = useMutation({
    mutationFn: async ({ id, ...data }: UpdateData) => {
      const { error } = await untypedFrom<GroupLocationTechnique>("product_group_location_techniques").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_LOCATION_TECHNIQUES_KEY] });
      toast.success("Técnica atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar técnica"),
  });

  const deleteTechnique = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await untypedFrom<GroupLocationTechnique>("product_group_location_techniques").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GROUP_LOCATION_TECHNIQUES_KEY] });
      toast.success("Técnica removida!");
    },
    onError: () => toast.error("Erro ao remover técnica"),
  });

  const getLocationsForComponent = (componentId: string) =>
    locations?.filter((l) => l.group_component_id === componentId) || [];

  const getTechniquesForLocation = (locationId: string) =>
    locationTechniques?.filter((lt) => lt.group_location_id === locationId)
      .map((lt) => ({ ...lt, technique: techniques?.find((t) => t.id === lt.technique_id) })) || [];

  const reorderComponents = async (components: GroupComponent[], oldIndex: number, newIndex: number) => {
    const { arrayMove } = await import("@dnd-kit/sortable");
    const reordered = arrayMove(components, oldIndex, newIndex);
    for (let i = 0; i < reordered.length; i++) {
      const item = reordered[i];
      if (item && item.sort_order !== i) {
        await untypedFrom<GroupComponent>("product_group_components").update({ sort_order: i }).eq("id", item.id);
      }
    }
    queryClient.invalidateQueries({ queryKey: [GROUP_COMPONENTS_KEY] });
    toast.success("Ordem atualizada!");
  };

  return {
    selectedGroup, setSelectedGroup,
    groups, groupsLoading,
    components, componentsLoading, componentsError,
    locations, locationsError, techniques, locationTechniques, locationTechniquesError,
    addComponent, updateComponent, deleteComponent,
    addLocation, updateLocation, deleteLocation,
    addTechnique, updateTechnique, deleteTechnique,
    getLocationsForComponent, getTechniquesForLocation,
    reorderComponents,
  };
}
