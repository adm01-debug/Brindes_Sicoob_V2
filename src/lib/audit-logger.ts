import { supabase } from "@/integrations/supabase/client";

export async function logAdminAction(
  userId: string | undefined,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'PUBLISH',
  entityType: 'PRODUCT' | 'CATEGORY' | 'CMS' | 'USER' | 'COUPON' | 'SINGULAR' | 'PA',
  entityId: string | undefined,
  oldData?: any,
  newData?: any
) {
  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
    });
    if (error) throw error;
  } catch (err) {
    console.error('Error logging admin action:', err);
  }
}
