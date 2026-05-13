
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
    // Generate a simple traceparent-like ID for W3C traceability if not present
    // Format: 00-traceId-spanId-flags (simplified)
    const traceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const traceparent = `00-${traceId}-0000000000000000-01`;

    const { error } = await supabase.functions.invoke('admin-audit-hook', {
      body: {
        event_type,
        entity_type,
        entity_id,
        payload,
        previous_state,
        metadata
      },
      headers: {
        'traceparent': traceparent
      }
    });

    if (error) console.error("Error logging admin action via hook:", error);
  } catch (err) {
    console.error("Critical error in logAdminAction:", err);
  }
}
