export * from "./useOrderComments";
export * from "./useOrderInvoices";
export * from "./useOrderLogistics";
export * from "./useOrderAudit";

// Mock hooks for missing ones to prevent build break after directory refactoring

export interface OrderPayment {
  id: string;
  status: 'paid' | 'pending' | 'overdue';
  installment_number?: number;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  payment_method?: string | null;
}

export interface OrderPilotApproval {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  photo_url?: string | null;
  feedback?: string | null;
}

export const useLogisticsTracking = (id?: string) => ({ tracking: null, isLoading: false });
export const useOrderTemplates = (id?: string) => ({ templates: [], isLoading: false });
export const useOrderPilotApprovals = (id?: string) => ({
  approvals: [] as OrderPilotApproval[],
  isLoading: false,
  updateApprovalStatus: {
    isPending: false,
    mutate: (_payload: { id: string; status: 'approved' | 'rejected' | 'revision'; feedback?: string }) => {},
  },
});
export const useOrderPayments = (id?: string) => ({ payments: [] as OrderPayment[], isLoading: false });
