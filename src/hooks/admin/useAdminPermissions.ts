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

  const permissions = useMemo(() => {
    return {
      canAccessUsers: isDev || isSupervisor,
      canAccessProducts: isDev || isSupervisor || isGestorCompras,
      canAccessCategories: isDev || isSupervisor || isGestorCompras,
      canAccessNewsletter: isDev || isSupervisor,
      canAccessCMS: isDev || isSupervisor,
      canAccessTelemetry: isDev,
      canAccessSecurity: isDev,
      canAccessCampaigns: isDev || isSupervisor || isGestorCompras,
      canAccessBudgets: isDev || isSupervisor || isGestorCompras,
      
      // Actions
      canEdit: isDev || isSupervisor,
      canDelete: isDev || isSupervisor,
      canImport: isDev || isSupervisor,
      canExport: isDev || isSupervisor,
      canPublish: isDev || isSupervisor,
    };
  }, [isDev, isSupervisor, isGestorCompras]);

  const checkModuleAccess = (module: AdminModule) => {
    switch (module) {
      case 'users': return permissions.canAccessUsers;
      case 'products': return permissions.canAccessProducts;
      case 'categories': return permissions.canAccessCategories;
      case 'newsletter': return permissions.canAccessNewsletter;
      case 'cms': return permissions.canAccessCMS;
      case 'telemetry': return permissions.canAccessTelemetry;
      case 'security': return permissions.canAccessSecurity;
      case 'campaigns': return permissions.canAccessCampaigns;
      case 'budgets': return permissions.canAccessBudgets;
      default: return false;
    }
  };

  return { ...permissions, checkModuleAccess };
}
