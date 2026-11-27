-- A imagem da Supabase já traz estes papéis; no Postgres puro do CI eles
-- precisam ser criados aqui.
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$roles$;

-- Recorte mínimo de `public.sicoob_orders` usado pelo ciclo de vida do SLA.
CREATE TABLE public.sicoob_orders (
  id uuid PRIMARY KEY,
  cooperative_id uuid,
  pa_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  sla_deadline timestamp with time zone,
  sla_status text DEFAULT 'normal'
);

-- Recorte do gatilho de SLA em vigor ANTES da migration
-- (produção: 20260503204301_c4d68747-...:29-47). A migration o substitui
-- para alinhar o limiar de alerta aos 80% do prazo documentados.
CREATE OR REPLACE FUNCTION public.check_order_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sla_deadline IS NOT NULL THEN
    IF NEW.sla_deadline < now() THEN
      NEW.sla_status := 'critical';
    ELSIF NEW.sla_deadline < now() + interval '2 hours' THEN
      NEW.sla_status := 'warning';
    ELSE
      NEW.sla_status := 'normal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_order_sla
BEFORE INSERT OR UPDATE ON public.sicoob_orders
FOR EACH ROW EXECUTE FUNCTION public.check_order_sla();
