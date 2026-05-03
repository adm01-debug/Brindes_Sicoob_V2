ALTER FUNCTION public.notify_approval_status_change() SET search_path = public;
ALTER FUNCTION public.approve_sicoob_order(UUID, UUID, UUID) SET search_path = public;
ALTER FUNCTION public.reject_sicoob_order(UUID, UUID, UUID, TEXT) SET search_path = public;
