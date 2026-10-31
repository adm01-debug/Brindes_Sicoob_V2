import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRODUCT_GROUPS_KEY = "product-groups";
const PRODUCT_GROUP_MEMBERS_KEY = "product-group-members";

export interface ProductGroup {
  id: string;
  group_code: string;
  group_name: string;
  description: string | null;
  is_active: boolean;
}

export interface SimpleProduct {
  id: string;
  name: string;
  sku: string;
}

export interface ProductGroupMember {
  id: string;
  product_group_id: string;
  product_id: string;
}

function useProductGroupQueries() {
  const groupsQuery = useQuery({ queryKey: [PRODUCT_GROUPS_KEY], queryFn: async () => { const { data, error } = await supabase.from("product_groups").select("*").order("group_name"); if (error) throw error; return data as ProductGroup[]; } });
  const productsQuery = useQuery({ queryKey: ["all-products-promobrind-full"], queryFn: async () => { const { fetchPromobrindProducts } = await import('@/lib/external-db'); const products = await fetchPromobrindProducts(); return products.map(product => ({ id: product.id, name: product.name, sku: product.sku })) as SimpleProduct[]; }, staleTime: 10 * 60 * 1000 });
  const membersQuery = useQuery({ queryKey: [PRODUCT_GROUP_MEMBERS_KEY], queryFn: async () => { const { data, error } = await supabase.from("product_group_members").select("*"); if (error) throw error; return data as ProductGroupMember[]; } });
  return { groups: groupsQuery.data, groupsLoading: groupsQuery.isLoading, allProducts: productsQuery.data, groupMembers: membersQuery.data };
}

function useProductGroupMutations() {
  const queryClient = useQueryClient();
  const refresh = (queryKey: string) => queryClient.invalidateQueries({ queryKey: [queryKey] });
  const addGroup = useMutation({ mutationFn: async (data: { group_code: string; group_name: string; description?: string }) => { const { error } = await supabase.from("product_groups").insert(data); if (error) throw error; }, onSuccess: () => { refresh(PRODUCT_GROUPS_KEY); toast.success("Grupo criado!"); }, onError: () => toast.error("Erro ao criar grupo") });
  const updateGroup = useMutation({ mutationFn: async ({ id, ...data }: { id: string; group_code?: string; group_name?: string; description?: string; is_active?: boolean }) => { const { error } = await supabase.from("product_groups").update(data).eq("id", id); if (error) throw error; }, onSuccess: () => { refresh(PRODUCT_GROUPS_KEY); toast.success("Grupo atualizado!"); }, onError: () => toast.error("Erro ao atualizar grupo") });
  const deleteGroup = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("product_groups").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { refresh(PRODUCT_GROUPS_KEY); toast.success("Grupo removido!"); }, onError: () => toast.error("Erro ao remover grupo") });
  const addMember = useMutation({ mutationFn: async (data: { product_group_id: string; product_id: string }) => { const { error } = await supabase.from("product_group_members").insert(data); if (error) throw error; }, onSuccess: () => { refresh(PRODUCT_GROUP_MEMBERS_KEY); toast.success("Produto adicionado ao grupo!"); }, onError: () => toast.error("Erro ao adicionar produto") });
  const removeMember = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("product_group_members").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { refresh(PRODUCT_GROUP_MEMBERS_KEY); toast.success("Produto removido do grupo!"); }, onError: () => toast.error("Erro ao remover produto") });
  return { addGroup, updateGroup, deleteGroup, addMember, removeMember };
}

export function useProductGroups() {
  const queries = useProductGroupQueries();
  const mutations = useProductGroupMutations();
  const { allProducts, groupMembers } = queries;

  const getMembersForGroup = (groupId: string) => groupMembers?.filter(m => m.product_group_id === groupId) || [];
  const getAvailableProducts = (groupId: string) => {
    const memberIds = getMembersForGroup(groupId).map(m => m.product_id);
    return allProducts?.filter(p => !memberIds.includes(p.id)) || [];
  };
  const getProductInfo = (productId: string) => allProducts?.find(p => p.id === productId);

  return {
    ...queries, ...mutations,
    getMembersForGroup, getAvailableProducts, getProductInfo,
  };
}
