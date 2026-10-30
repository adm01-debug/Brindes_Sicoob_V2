import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProductGroupMember } from "./usePersonalizationData";
import { GroupInheritanceSection } from "../personalization-manager/GroupInheritanceSection";

interface GroupInheritanceProps {
  productMembership: ProductGroupMember;
  toggleGroupRules: (params: { id: string; use_group_rules: boolean }) => void;
}

export function GroupInheritance({ productMembership, toggleGroupRules }: GroupInheritanceProps) {
  const queryClient = useQueryClient();
  const [isCopying, setIsCopying] = useState(false);
  const isUsingGroupRules = productMembership.use_group_rules;

  const copyGroupRulesToProduct = async () => {
    setIsCopying(true);
    try {
      const { error } = await supabase.rpc("copy_group_personalization_to_product", { p_membership_id: productMembership.id });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["product-components"] });
      queryClient.invalidateQueries({ queryKey: ["component-locations"] });
      queryClient.invalidateQueries({ queryKey: ["location-techniques"] });
      queryClient.invalidateQueries({ queryKey: ["product-membership"] });
      toast.success("Regras do grupo copiadas!");
    } catch (error) {
      console.error("Error copying rules:", error);
      toast.error("Erro ao copiar regras do grupo");
    } finally {
      setIsCopying(false);
    }
  };

  return <GroupInheritanceSection productMembership={productMembership} isUsingGroupRules={isUsingGroupRules} isCopying={isCopying} copyGroupRulesToProduct={() => void copyGroupRulesToProduct()} toggleGroupRules={toggleGroupRules} />;
}
