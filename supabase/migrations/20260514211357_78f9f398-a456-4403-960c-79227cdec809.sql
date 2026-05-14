-- Harden send_notification with correct signature
ALTER FUNCTION public.send_notification(uuid, text, text, text, text, text, jsonb) SET search_path = public;
