import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export type AuditEntityType = 
  | 'products' 
  | 'product_variants' 
  | 'product_images'
  | 'product_videos'
  | 'quotes' 
  | 'quote_items'
  | 'orders' 
  | 'order_items'
  | 'suppliers' 
  | 'categories'
  | 'material_types'
  | 'color_variations'
  | 'companies'
  | 'company_contacts';

interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = async ({
    action,
    entityType,
    entityId,
    oldValues = null,
    newValues = null
  }: AuditLogParams): Promise<{ success: boolean; error?: Error }> => {
    try {
      const { error } = await supabase.from('audit_log').insert({
        user_id: user?.id || null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      });

      if (error) {
        console.error('Erro ao registrar audit log:', error);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar audit log:', error);
      return { success: false, error: error as Error };
    }
  };

  const getChangedFields = (
    oldRecord: Record<string, any>,
    newRecord: Record<string, any>
  ): { oldFields: Record<string, any>; newFields: Record<string, any> } => {
    const oldFields: Record<string, any> = {};
    const newFields: Record<string, any> = {};

    Object.keys(newRecord).forEach(key => {
      if (['updated_at', 'created_at'].includes(key)) return;
      
      const oldValue = oldRecord[key];
      const newValue = newRecord[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        oldFields[key] = oldValue;
        newFields[key] = newValue;
      }
    });

    return { oldFields, newFields };
  };

  const auditedInsert = async <T extends Record<string, unknown>>(
    table: AuditEntityType,
    data: T,
    insertFn: () => Promise<{ data: (T & { id: string }) | null; error: Error | null }>
  ): Promise<{ data: (T & { id: string }) | null; error: Error | null }> => {
    const result = await insertFn();
    
    if (result.data && !result.error) {
      await logAction({
        action: 'INSERT',
        entityType: table,
        entityId: result.data.id,
        oldValues: null,
        newValues: data
      });
    }

    return result;
  };

  const auditedUpdate = async <T extends Record<string, unknown>>(
    table: AuditEntityType,
    entityId: string,
    oldRecord: T,
    updates: Partial<T>,
    updateFn: () => Promise<{ data: T | null; error: Error | null }>
  ): Promise<{ data: T | null; error: Error | null }> => {
    const result = await updateFn();
    
    if (result.data && !result.error) {
      const { oldFields, newFields } = getChangedFields(oldRecord, updates);
      
      if (Object.keys(newFields).length > 0) {
        await logAction({
          action: 'UPDATE',
          entityType: table,
          entityId,
          oldValues: oldFields,
          newValues: newFields
        });
      }
    }

    return result;
  };

  const auditedDelete = async <T extends Record<string, unknown>>(
    table: AuditEntityType,
    entityId: string,
    oldRecord: T,
    deleteFn: () => Promise<{ error: Error | null }>
  ): Promise<{ error: Error | null }> => {
    const result = await deleteFn();
    
    if (!result.error) {
      await logAction({
        action: 'DELETE',
        entityType: table,
        entityId,
        oldValues: oldRecord,
        newValues: null
      });
    }

    return result;
  };

  return {
    logAction,
    getChangedFields,
    auditedInsert,
    auditedUpdate,
    auditedDelete
  };
}

export async function fetchAuditHistory(
  entityType: AuditEntityType,
  entityId: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de auditoria:', error);
    return [];
  }

  return (data || []) as AuditLogEntry[];
}

export async function fetchAllAuditLogs(
  filters?: {
    entityType?: AuditEntityType;
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit = 100
): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_log')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters?.action) {
    query = query.eq('action', filters.action);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return [];
  }

  return (data || []) as AuditLogEntry[];
}
