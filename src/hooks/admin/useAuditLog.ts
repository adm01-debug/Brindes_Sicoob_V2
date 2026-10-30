import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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
  oldValues?: Json | null;
  newValues?: Json | null;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

// audit_log.user_id referencia auth.users(id), não profiles(id) — não há
// FK direta pra embutir "profiles:user_id(...)" no select do PostgREST
// (relação sempre falha em runtime, erro é engolido e a lista some vazia).
// Join client-side via profiles.user_id, mesmo padrão de useSalesHistoryMacro.ts.
async function attachProfiles(
  rows: Array<Omit<AuditLogEntry, 'profiles' | 'old_values' | 'new_values'> & { old_values: unknown; new_values: unknown }>
): Promise<AuditLogEntry[]> {
  const userIds = [...new Set(rows.map(r => r.user_id).filter((id): id is string => !!id))];

  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    for (const p of profiles || []) profileMap.set(p.user_id, { full_name: p.full_name, email: p.email });
  }

  return rows.map(r => ({
    ...r,
    old_values: r.old_values as Json | null,
    new_values: r.new_values as Json | null,
    profiles: (r.user_id && profileMap.get(r.user_id)) || null,
  }));
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
    oldRecord: Record<string, unknown>,
    newRecord: Record<string, unknown>
  ): { oldFields: Record<string, Json | undefined>; newFields: Record<string, Json | undefined> } => {
    const oldFields: Record<string, Json | undefined> = {};
    const newFields: Record<string, Json | undefined> = {};

    Object.keys(newRecord).forEach(key => {
      if (['updated_at', 'created_at'].includes(key)) return;
      
      const oldValue = oldRecord[key];
      const newValue = newRecord[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        oldFields[key] = oldValue as Json | undefined;
        newFields[key] = newValue as Json | undefined;
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
        newValues: data as unknown as Json,
      });
    }

    return result;
  };

  const auditedUpdate = async <T extends Record<string, unknown>>(
    table: AuditEntityType,
    entityId: string,
    oldRecord: T,
    ...operation: [
      updates: Partial<T>,
      updateFn: () => Promise<{ data: T | null; error: Error | null }>,
    ]
  ): Promise<{ data: T | null; error: Error | null }> => {
    const [updates, updateFn] = operation;
    const result = await updateFn();
    
    if (result.data && !result.error) {
      const { oldFields, newFields } = getChangedFields(oldRecord, updates);
      
      if (Object.keys(newFields).length > 0) {
        await logAction({
          action: 'UPDATE',
          entityType: table,
          entityId,
          oldValues: oldFields as Json,
          newValues: newFields as Json,
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
        oldValues: oldRecord as unknown as Json,
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
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de auditoria:', error);
    return [];
  }

  return attachProfiles(data || []);
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
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  const filterEntity = () => {
    if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
  };
  const filterAction = () => {
    if (filters?.action) query = query.eq('action', filters.action);
  };
  const filterUser = () => {
    if (filters?.userId) query = query.eq('user_id', filters.userId);
  };
  const filterStartDate = () => {
    if (filters?.startDate) query = query.gte('created_at', filters.startDate.toISOString());
  };
  const filterEndDate = () => {
    if (filters?.endDate) query = query.lte('created_at', filters.endDate.toISOString());
  };
  filterEntity();
  filterAction();
  filterUser();
  filterStartDate();
  filterEndDate();

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return [];
  }

  return attachProfiles(data || []);
}
