CREATE OR REPLACE FUNCTION public.protect_sicoob_order_artwork_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Versões de arte não podem ser excluídas.';
  END IF;
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.file_path IS DISTINCT FROM OLD.file_path
     OR NEW.file_sha256 IS DISTINCT FROM OLD.file_sha256
     OR NEW.identity_snapshot IS DISTINCT FROM OLD.identity_snapshot
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A versão de arte é imutável.';
  END IF;
  IF NEW.is_latest IS DISTINCT FROM OLD.is_latest
     AND current_setting('app.sicoob_artwork_operation', true) IS DISTINCT FROM 'version' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente uma nova versão pode substituir a arte vigente.';
  END IF;
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.feedback IS DISTINCT FROM OLD.feedback
      OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
      OR NEW.decided_at IS DISTINCT FROM OLD.decided_at)
     AND current_setting('app.sicoob_artwork_operation', true) IS DISTINCT FROM 'decide' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A decisão exige o fluxo formal de aprovação da arte.';
  END IF;
  RETURN NEW;
END;
$function$
