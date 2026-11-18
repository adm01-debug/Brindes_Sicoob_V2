CREATE OR REPLACE FUNCTION public.prevent_critical_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Bloqueia deleção se o registro tiver mais de 24 horas (exemplo para orçamentos e pedidos)
    IF (OLD.created_at < now() - interval '24 hours') AND (public.has_role(auth.uid(), 'admin') = false) THEN
        RAISE EXCEPTION 'Registros históricos não podem ser removidos por usuários não-administradores.';
    END IF;
    RETURN OLD;
END;
$function$
