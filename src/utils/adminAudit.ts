
import { supabase } from "@/integrations/supabase/client";

export type AuditEventType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'IMPORT' 
  | 'EXPORT' 
  | 'PUBLISH_CMS' 
  | 'APPROVE_CHANGE'
  | 'REJECT_CHANGE'
  | 'SECURITY_CONFIG_CHANGE';

interface LogAdminActionParams {
  event_type: AuditEventType;
  entity_type: string;
  entity_id?: string;
  payload?: any;
  previous_state?: any;
  metadata?: Record<string, any>;
}

export async function logAdminAction({
  event_type,
  entity_type,
  entity_id,
  payload,
  previous_state,
  metadata
}: LogAdminActionParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('admin_audit_log')
      .insert({
        user_id: user.id,
        event_type,
        entity_type,
        entity_id,
        new_data: payload,
        old_data: previous_state,
        metadata: {
          ...metadata,
          user_email: user.email,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

    if (error) console.error("Error logging admin action:", error);
  } catch (err) {
    console.error("Critical error in logAdminAction:", err);
  }
}
