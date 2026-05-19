export * from "./useOrderComments";
export * from "./useOrderInvoices";
export * from "./useOrderLogistics";
export * from "./useOrderAudit";

// Mock hooks for missing ones to prevent build break after directory refactoring
export const useLogisticsTracking = (id?: string) => ({ tracking: null, isLoading: false });
export const useOrderTemplates = (id?: string) => ({ templates: [], isLoading: false });
export const useOrderPilotApprovals = (id?: string) => ({ approvals: [], isLoading: false });
export const useOrderPayments = (id?: string) => ({ payments: [], isLoading: false });

