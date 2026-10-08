import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export type AdminModule = 
  | 'users' 
  | 'products' 
  | 'categories' 
  | 'newsletter' 
  | 'cms' 
  | 'telemetry' 
  | 'security'
  | 'campaigns'
  | 'budgets';

export function useAdminPermissions() {
  const { isDev, isSupervisor, isGestorCompras } = useAuth();
  const adminAccess = isDev || isSupervisor;
  const purchasingAccess = adminAccess || isGestorCompras;

  const permissions = useMemo(() => {
    return {
      canAccessUsers: adminAccess,
      canAccessProducts: purchasingAccess,
      canAccessCategories: purchasingAccess,
      canAccessNewsletter: adminAccess,
      canAccessCMS: adminAccess,
      canAccessTelemetry: isDev,
      canAccessSecurity: isDev,
      canAccessCampaigns: purchasingAccess,
      canAccessBudgets: purchasingAccess,
      
      // Actions
      canEdit: adminAccess,
      canDelete: adminAccess,
      canImport: adminAccess,
      canExport: adminAccess,
      canPublish: adminAccess,
    };
  }, [adminAccess, isDev, purchasingAccess]);

  const checkModuleAccess = (module: AdminModule) => {
    const access: Record<AdminModule, boolean> = {
      users: permissions.canAccessUsers,
      products: permissions.canAccessProducts,
      categories: permissions.canAccessCategories,
      newsletter: permissions.canAccessNewsletter,
      cms: permissions.canAccessCMS,
      telemetry: permissions.canAccessTelemetry,
      security: permissions.canAccessSecurity,
      campaigns: permissions.canAccessCampaigns,
      budgets: permissions.canAccessBudgets,
    };
    return access[module];
  };

  return { ...permissions, checkModuleAccess };
}
