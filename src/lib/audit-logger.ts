import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface AdminActionInput {
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'PUBLISH';
  entityType: 'PRODUCT' | 'CATEGORY' | 'CMS' | 'USER' | 'COUPON' | 'SINGULAR' | 'PA';
  entityId?: string;
  oldData?: Json;
  newData?: Json;
}

export async function logAdminAction({
  userId,
  action,
  entityType,
  entityId,
  oldData,
  newData,
}: AdminActionInput) {
  if (!userId) {
    console.warn('Ação administrativa não registrada: usuário ausente.');
    return;
  }

  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      user_id: userId,
      action,
      resource_type: entityType,
      resource_id: entityId ?? null,
      details: { old_data: oldData ?? null, new_data: newData ?? null },
    });
    if (error) throw error;
  } catch (err) {
    console.error('Error logging admin action:', err);
  }
}
