CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

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
