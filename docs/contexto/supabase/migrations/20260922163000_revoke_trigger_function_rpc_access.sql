-- Funções que retornam trigger são executadas pelo mecanismo de triggers e não
-- constituem RPCs de cliente. Remove grants diretos herdados dos default
-- privileges sem alterar a execução dos triggers nem o service_role.

DO $acl$
DECLARE
  target regprocedure;
BEGIN
  FOR target IN
    SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      target
    );
  END LOOP;
END
$acl$;
