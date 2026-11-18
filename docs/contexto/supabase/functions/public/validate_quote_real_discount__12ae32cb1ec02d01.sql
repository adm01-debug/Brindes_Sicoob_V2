CREATE OR REPLACE FUNCTION public.validate_quote_real_discount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_markup numeric := COALESCE(NEW.negotiation_markup_percent, 0);
  v_apparent_pct numeric := COALESCE(NEW.discount_percent, 0);
  v_presented numeric := COALESCE(NEW.subtotal, 0);
  v_real_sub numeric;
  v_final numeric;
  v_real_pct numeric;
  v_max_allowed numeric;
  v_is_admin boolean;
BEGIN
  v_real_sub := CASE WHEN v_markup > 0
    THEN v_presented / (1 + v_markup / 100)
    ELSE v_presented
  END;
  v_final := v_presented * (1 - v_apparent_pct / 100);
  v_real_pct := CASE WHEN v_real_sub > 0
    THEN ROUND(((v_real_sub - v_final) / v_real_sub) * 100, 2)
    ELSE 0
  END;

  NEW.real_subtotal := ROUND(v_real_sub, 2);
  NEW.real_discount_percent := v_real_pct;

  -- Rascunhos podem conter uma proposta acima da alçada para que o vendedor
  -- consiga corrigir uma recusa. A regra é exigida quando o orçamento avança.
  IF current_setting('app.quote_discount_approval_commit', true) IS DISTINCT FROM 'true'
     AND NEW.status IN ('pending', 'sent', 'approved')
     AND NEW.seller_id IS NOT NULL
     AND v_real_pct > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.seller_id AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      SELECT max_discount_percent INTO v_max_allowed
      FROM public.seller_discount_limits
      WHERE user_id = NEW.seller_id;

      IF v_max_allowed IS NOT NULL AND v_real_pct > v_max_allowed
         AND NOT EXISTS (
           SELECT 1
           FROM public.discount_approval_requests dar
           WHERE dar.quote_id = NEW.id
             AND dar.status = 'approved'
             AND dar.requested_real_discount_percent = v_real_pct
             AND TG_OP = 'UPDATE'
             AND dar.approved_quote_row_version = OLD.row_version
         ) THEN
        RAISE EXCEPTION
          'Desconto real (%.2f%%) excede o limite do vendedor e não possui aprovação vigente.',
          v_real_pct
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
