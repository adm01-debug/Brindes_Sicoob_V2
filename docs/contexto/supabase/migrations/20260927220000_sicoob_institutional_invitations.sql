-- Convites institucionais Sicoob: token opaco, aceite atômico, revogação e
-- revalidação imediata do vínculo ativo em todas as consultas de papel.

CREATE TABLE public.sicoob_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash bytea NOT NULL UNIQUE,
  email text NOT NULL,
  cooperative_id uuid NOT NULL REFERENCES public.cooperativas(id) ON DELETE RESTRICT,
  pa_id uuid REFERENCES public.postos_atendimento(id) ON DELETE RESTRICT,
  role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'superseded')),
  expires_at timestamptz NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  access_revoked_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  access_revoked_at timestamptz,
  superseded_by uuid REFERENCES public.sicoob_invitations(id) ON DELETE SET NULL,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sicoob_invitations_email_normalized
    CHECK (email = lower(trim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  CONSTRAINT sicoob_invitations_expiry_after_creation
    CHECK (expires_at > created_at),
  CONSTRAINT sicoob_invitations_acceptance_consistent
    CHECK ((status = 'accepted') = (accepted_by IS NOT NULL AND accepted_at IS NOT NULL)),
  CONSTRAINT sicoob_invitations_revocation_consistent
    CHECK ((status = 'revoked') = (revoked_by IS NOT NULL AND revoked_at IS NOT NULL)),
  UNIQUE (invited_by, idempotency_key)
);

CREATE UNIQUE INDEX sicoob_invitations_one_pending_scope
  ON public.sicoob_invitations (
    email,
    cooperative_id,
    COALESCE(pa_id, '00000000-0000-0000-0000-000000000000'::uuid),
    role
  )
  WHERE status = 'pending';
CREATE INDEX idx_sicoob_invitations_cooperative_id
  ON public.sicoob_invitations(cooperative_id);
CREATE INDEX idx_sicoob_invitations_pa_id
  ON public.sicoob_invitations(pa_id);
CREATE INDEX idx_sicoob_invitations_invited_by
  ON public.sicoob_invitations(invited_by);
CREATE INDEX idx_sicoob_invitations_accepted_by
  ON public.sicoob_invitations(accepted_by);
CREATE INDEX idx_sicoob_invitations_pending_expiry
  ON public.sicoob_invitations(expires_at)
  WHERE status = 'pending';

CREATE TABLE public.sicoob_invitation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES public.sicoob_invitations(id) ON DELETE RESTRICT,
  cooperative_id uuid NOT NULL REFERENCES public.cooperativas(id) ON DELETE RESTRICT,
  action text NOT NULL
    CHECK (action IN ('issued', 'superseded', 'accepted', 'revoked', 'access_revoked')),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sicoob_invitation_events_invitation_id
  ON public.sicoob_invitation_events(invitation_id);
CREATE INDEX idx_sicoob_invitation_events_cooperative_id
  ON public.sicoob_invitation_events(cooperative_id);
CREATE INDEX idx_sicoob_invitation_events_actor_id
  ON public.sicoob_invitation_events(actor_id);
CREATE INDEX idx_sicoob_invitation_events_target_user_id
  ON public.sicoob_invitation_events(target_user_id);

ALTER TABLE public.sicoob_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_invitation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_invitation_events FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.sicoob_actor_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL
    AND (auth.role() = 'service_role' OR _user_id = auth.uid())
    AND EXISTS (
      SELECT 1
        FROM public.profiles p
       WHERE (p.user_id = _user_id OR p.id = _user_id)
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
    );
$$;

-- Um JWT ainda válido não conserva privilégios depois da revogação do perfil.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.sicoob_actor_is_active(_user_id)
    AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
       WHERE ur.user_id = _user_id
         AND ur.role = _role
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.sicoob_actor_is_active(_user_id)
    AND EXISTS (
      SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = _user_id
         AND ur.role IN (
           'admin'::public.app_role,
           'dev'::public.app_role,
           'supervisor'::public.app_role
         )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.sicoob_actor_is_active(_user_id)
    AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
       WHERE ur.user_id = _user_id
         AND ur.role = 'dev'::public.app_role
    );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_inviter_can_issue(
  p_actor_id uuid,
  p_cooperative_id uuid,
  p_role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
  )
  AND p_role NOT IN ('admin'::public.app_role, 'dev'::public.app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = p_actor_id
         AND ur.role IN ('admin'::public.app_role, 'dev'::public.app_role)
    )
    OR (
      p_role IN (
        'vendedor'::public.app_role,
        'gerente_pa'::public.app_role,
        'comprador_pac'::public.app_role
      )
      AND EXISTS (
        SELECT 1
          FROM public.profiles p
          JOIN public.user_roles ur ON ur.user_id = p_actor_id
         WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
           AND (ur.role = 'supervisor'::public.app_role OR p.cooperativa_id = p_cooperative_id)
           AND p.is_active IS TRUE
           AND p.deleted_at IS NULL
           AND ur.role IN (
             'supervisor'::public.app_role,
             'gestor_compras'::public.app_role,
             'comprador_singular'::public.app_role
           )
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_issue_invitation(
  p_cooperative_id uuid,
  p_role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_inviter_can_issue(auth.uid(), p_cooperative_id, p_role);
$$;

CREATE POLICY sicoob_invitations_authorized_read
  ON public.sicoob_invitations
  FOR SELECT TO authenticated
  USING (
    invited_by = auth.uid()
    OR accepted_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.sicoob_current_actor_can_issue_invitation(cooperative_id, role)
  );

CREATE POLICY sicoob_invitation_events_authorized_read
  ON public.sicoob_invitation_events
  FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR target_user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.sicoob_current_actor_can_issue_invitation(cooperative_id, 'vendedor'::public.app_role)
    OR EXISTS (
      SELECT 1
        FROM public.sicoob_invitations i
       WHERE i.id = invitation_id
         AND public.sicoob_current_actor_can_issue_invitation(i.cooperative_id, i.role)
    )
  );

CREATE OR REPLACE FUNCTION public.reject_sicoob_invitation_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Eventos de convite são imutáveis.';
END;
$$;

CREATE TRIGGER tr_sicoob_invitation_events_immutable
  BEFORE UPDATE OR DELETE ON public.sicoob_invitation_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_sicoob_invitation_event_mutation();

CREATE OR REPLACE FUNCTION public.issue_sicoob_invitation(
  p_email text,
  p_cooperative_id uuid,
  p_pa_id uuid,
  p_role public.app_role,
  p_expires_in_hours integer,
  p_idempotency_key uuid
)
RETURNS TABLE(invitation_id uuid, invitation_token text, invitation_expires_at timestamptz, reused boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_token text;
  v_invitation public.sicoob_invitations%ROWTYPE;
  v_superseded_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Ator e chave de idempotência são obrigatórios.';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um email institucional válido.';
  END IF;
  IF p_expires_in_hours IS NULL OR p_expires_in_hours < 1 OR p_expires_in_hours > 168 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A validade deve ficar entre 1 e 168 horas.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cooperativas c
     WHERE c.id = p_cooperative_id AND c.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'A cooperativa informada não está ativa.';
  END IF;
  IF p_role IN ('gerente_pa'::public.app_role, 'comprador_pac'::public.app_role) AND p_pa_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O papel informado exige um PA.';
  END IF;
  IF p_role IN (
    'gestor_compras'::public.app_role,
    'comprador_singular'::public.app_role,
    'supervisor'::public.app_role,
    'manager'::public.app_role
  ) AND p_pa_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O papel informado pertence à Singular e não aceita PA.';
  END IF;
  IF p_pa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.postos_atendimento pa
     WHERE pa.id = p_pa_id
       AND pa.cooperativa_id = p_cooperative_id
       AND pa.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'O PA não pertence à cooperativa ou está inativo.';
  END IF;
  IF NOT public.sicoob_inviter_can_issue(v_actor_id, p_cooperative_id, p_role) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode conceder este papel neste escopo.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'sicoob-invitation-idempotency:' || v_actor_id::text || ':' || p_idempotency_key::text, 0
  ));
  SELECT * INTO v_invitation
    FROM public.sicoob_invitations i
   WHERE i.invited_by = v_actor_id
     AND i.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_invitation.email IS DISTINCT FROM v_email
       OR v_invitation.cooperative_id IS DISTINCT FROM p_cooperative_id
       OR v_invitation.pa_id IS DISTINCT FROM p_pa_id
       OR v_invitation.role IS DISTINCT FROM p_role THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com outro conteúdo.';
    END IF;
    RETURN QUERY SELECT v_invitation.id, NULL::text, v_invitation.expires_at, true;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'sicoob-invitation-scope:' || v_email || ':' || p_cooperative_id::text || ':'
      || COALESCE(p_pa_id::text, '-') || ':' || p_role::text, 0
  ));

  IF EXISTS (
    SELECT 1
      FROM auth.users u
      JOIN public.profiles p ON p.user_id = u.id
     WHERE lower(u.email) = v_email
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
       AND (
         (p.cooperativa_id IS NOT NULL AND p.cooperativa_id IS DISTINCT FROM p_cooperative_id)
         OR (p.pa_id IS NOT NULL AND p.pa_id IS DISTINCT FROM p_pa_id)
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O usuário já possui vínculo ativo em outro escopo.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM auth.users u
      JOIN public.profiles p ON p.user_id = u.id
      JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = p_role
     WHERE lower(u.email) = v_email
       AND p.cooperativa_id = p_cooperative_id
       AND p.pa_id IS NOT DISTINCT FROM p_pa_id
       AND p.is_active IS TRUE
       AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'O usuário já possui este vínculo e papel.';
  END IF;

  FOR v_superseded_id IN
    UPDATE public.sicoob_invitations i
       SET status = 'superseded', updated_at = now()
     WHERE i.email = v_email
       AND i.cooperative_id = p_cooperative_id
       AND i.pa_id IS NOT DISTINCT FROM p_pa_id
       AND i.role = p_role
       AND i.status = 'pending'
    RETURNING i.id
  LOOP
    INSERT INTO public.sicoob_invitation_events (
      invitation_id, cooperative_id, action, actor_id, details
    ) VALUES (
      v_superseded_id, p_cooperative_id, 'superseded', v_actor_id,
      jsonb_build_object('reason', 'reissued')
    );
  END LOOP;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.sicoob_invitations (
    token_hash, email, cooperative_id, pa_id, role, expires_at, invited_by, idempotency_key
  ) VALUES (
    extensions.digest(v_token, 'sha256'), v_email, p_cooperative_id, p_pa_id, p_role,
    now() + make_interval(hours => p_expires_in_hours), v_actor_id, p_idempotency_key
  ) RETURNING * INTO v_invitation;

  UPDATE public.sicoob_invitations
     SET superseded_by = v_invitation.id
   WHERE id = v_superseded_id;

  INSERT INTO public.sicoob_invitation_events (
    invitation_id, cooperative_id, action, actor_id,
    details
  ) VALUES (
    v_invitation.id, p_cooperative_id, 'issued', v_actor_id,
    jsonb_build_object('role', p_role::text, 'pa_id', p_pa_id, 'expires_at', v_invitation.expires_at)
  );

  RETURN QUERY SELECT v_invitation.id, v_token, v_invitation.expires_at, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sicoob_invitation(p_token text)
RETURNS TABLE(
  invitation_id uuid,
  masked_email text,
  cooperative_name text,
  pa_name text,
  pa_code text,
  invited_role text,
  invitation_status text,
  invitation_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT i.id,
         left(split_part(i.email, '@', 1), 1) || '***@' || split_part(i.email, '@', 2),
         c.nome,
         pa.nome,
         pa.codigo,
         i.role::text,
         CASE WHEN i.status = 'pending' AND i.expires_at <= now() THEN 'expired' ELSE i.status END,
         i.expires_at
    FROM public.sicoob_invitations i
    JOIN public.cooperativas c ON c.id = i.cooperative_id
    LEFT JOIN public.postos_atendimento pa ON pa.id = i.pa_id
   WHERE p_token ~ '^[0-9a-f]{64}$'
     AND i.token_hash = extensions.digest(p_token, 'sha256')
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_sicoob_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.sicoob_invitations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Convite ou sessão inválidos.';
  END IF;
  SELECT lower(email), email_confirmed_at
    INTO v_actor_email, v_email_confirmed_at
    FROM auth.users
   WHERE id = v_actor_id;
  IF v_actor_email IS NULL OR v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Confirme o email da conta antes de aceitar o convite.';
  END IF;

  SELECT * INTO v_invitation
    FROM public.sicoob_invitations i
   WHERE i.token_hash = extensions.digest(p_token, 'sha256')
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convite não encontrado.';
  END IF;
  IF v_invitation.status = 'accepted' AND v_invitation.accepted_by = v_actor_id THEN
    RETURN v_invitation.id;
  END IF;
  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O convite foi revogado, substituído ou já utilizado.';
  END IF;
  IF v_invitation.expires_at <= now() THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O convite expirou.';
  END IF;
  IF v_actor_email IS DISTINCT FROM v_invitation.email THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Entre com a conta correspondente ao email convidado.';
  END IF;
  IF NOT public.sicoob_inviter_can_issue(
    v_invitation.invited_by, v_invitation.cooperative_id, v_invitation.role
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A autoridade do emissor não está mais vigente.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.cooperativas c
     WHERE c.id = v_invitation.cooperative_id AND c.is_active IS TRUE
  ) OR (
    v_invitation.pa_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.postos_atendimento pa
       WHERE pa.id = v_invitation.pa_id
         AND pa.cooperativa_id = v_invitation.cooperative_id
         AND pa.is_active IS TRUE
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A cooperativa ou o PA do convite não está mais ativo.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles p
   WHERE p.user_id = v_actor_id
   FOR UPDATE;
  IF FOUND AND (
    (v_profile.cooperativa_id IS NOT NULL AND v_profile.cooperativa_id IS DISTINCT FROM v_invitation.cooperative_id)
    OR (v_profile.pa_id IS NOT NULL AND v_profile.pa_id IS DISTINCT FROM v_invitation.pa_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A conta já possui vínculo ativo em outro escopo.';
  END IF;

  -- O cadastro fechado cria um papel vendedor provisório. Se ele for o único
  -- papel e a conta ainda não possuir escopo institucional, o aceite o troca
  -- pelo papel aprovado, evitando acumular privilégios por efeito do bootstrap.
  IF FOUND
     AND v_profile.cooperativa_id IS NULL
     AND v_profile.pa_id IS NULL
     AND (SELECT count(*) FROM public.user_roles ur WHERE ur.user_id = v_actor_id) = 1
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id AND ur.role = 'vendedor'::public.app_role
     ) THEN
    DELETE FROM public.user_roles
     WHERE user_id = v_actor_id AND role = 'vendedor'::public.app_role;
  END IF;

  INSERT INTO public.profiles (
    id, user_id, email, is_active, cooperativa_id, singular_id, pa_id, deleted_at
  ) VALUES (
    v_actor_id, v_actor_id, v_actor_email, true,
    v_invitation.cooperative_id, v_invitation.cooperative_id, v_invitation.pa_id, NULL
  )
  ON CONFLICT (user_id) DO UPDATE
    SET is_active = true,
        deleted_at = NULL,
        cooperativa_id = EXCLUDED.cooperativa_id,
        singular_id = EXCLUDED.singular_id,
        pa_id = EXCLUDED.pa_id,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_actor_id, v_invitation.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.sicoob_invitations
     SET status = 'accepted', accepted_by = v_actor_id, accepted_at = now(), updated_at = now()
   WHERE id = v_invitation.id;
  INSERT INTO public.sicoob_invitation_events (
    invitation_id, cooperative_id, action, actor_id, target_user_id,
    details
  ) VALUES (
    v_invitation.id, v_invitation.cooperative_id, 'accepted', v_actor_id, v_actor_id,
    jsonb_build_object('role', v_invitation.role::text, 'pa_id', v_invitation.pa_id)
  );
  RETURN v_invitation.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_sicoob_invitation(p_invitation_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_invitation public.sicoob_invitations%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR NULLIF(trim(p_reason), '') IS NULL OR length(trim(p_reason)) < 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com pelo menos oito caracteres.';
  END IF;
  SELECT * INTO v_invitation
    FROM public.sicoob_invitations
   WHERE id = p_invitation_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Convite não encontrado.'; END IF;
  IF v_invitation.status = 'revoked' AND v_invitation.revoked_by = v_actor_id THEN RETURN; END IF;
  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente convites pendentes podem ser revogados.';
  END IF;
  IF v_invitation.invited_by <> v_actor_id
     AND NOT public.sicoob_inviter_can_issue(v_actor_id, v_invitation.cooperative_id, v_invitation.role) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode revogar este convite.';
  END IF;
  UPDATE public.sicoob_invitations
     SET status = 'revoked', revoked_by = v_actor_id, revoked_at = now(), updated_at = now()
   WHERE id = v_invitation.id;
  INSERT INTO public.sicoob_invitation_events (
    invitation_id, cooperative_id, action, actor_id, details
  ) VALUES (
    v_invitation.id, v_invitation.cooperative_id, 'revoked', v_actor_id,
    jsonb_build_object('reason', trim(p_reason))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_sicoob_user_access(p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_target_profile public.profiles%ROWTYPE;
  v_actor_is_platform_admin boolean;
BEGIN
  IF v_actor_id IS NULL OR p_user_id IS NULL OR p_user_id = v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Ator e usuário alvo distintos são obrigatórios.';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL OR length(trim(p_reason)) < 8 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com pelo menos oito caracteres.';
  END IF;
  SELECT * INTO v_target_profile
    FROM public.profiles p
   WHERE p.user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND OR v_target_profile.is_active IS DISTINCT FROM true OR v_target_profile.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = v_actor_id
       AND ur.role IN ('admin'::public.app_role, 'dev'::public.app_role)
  ) AND public.sicoob_actor_is_active(v_actor_id)
  INTO v_actor_is_platform_admin;

  IF NOT v_actor_is_platform_admin AND NOT (
    EXISTS (
      SELECT 1
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = v_actor_id
       WHERE p.user_id = v_actor_id
         AND p.cooperativa_id = v_target_profile.cooperativa_id
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
         AND ur.role IN ('gestor_compras'::public.app_role, 'comprador_singular'::public.app_role)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = p_user_id
         AND ur.role NOT IN (
           'vendedor'::public.app_role,
           'gerente_pa'::public.app_role,
           'comprador_pac'::public.app_role
         )
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode revogar este vínculo.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = p_user_id AND ur.role = 'dev'::public.app_role
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = v_actor_id AND ur.role = 'dev'::public.app_role
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Somente outro desenvolvedor pode revogar acesso técnico.';
  END IF;

  UPDATE public.profiles
     SET is_active = false, deleted_at = now(), updated_at = now()
   WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  UPDATE public.sicoob_invitations
     SET access_revoked_by = v_actor_id,
         access_revoked_at = now(),
         updated_at = now()
   WHERE accepted_by = p_user_id
     AND cooperative_id = v_target_profile.cooperativa_id
     AND access_revoked_at IS NULL;
  INSERT INTO public.sicoob_invitation_events (
    cooperative_id, action, actor_id, target_user_id, details
  ) VALUES (
    v_target_profile.cooperativa_id, 'access_revoked', v_actor_id, p_user_id,
    jsonb_build_object('reason', trim(p_reason), 'pa_id', v_target_profile.pa_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sicoob_access_state()
RETURNS TABLE(active boolean, reason text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
           WHEN auth.uid() IS NULL THEN false
           WHEN NOT EXISTS (
             SELECT 1 FROM public.profiles p
              WHERE p.user_id = auth.uid()
                AND p.is_active IS TRUE
                AND p.deleted_at IS NULL
           ) THEN false
           WHEN NOT EXISTS (
             SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
           ) THEN false
           ELSE true
         END,
         CASE
           WHEN auth.uid() IS NULL THEN 'missing_session'
           WHEN NOT EXISTS (
             SELECT 1 FROM public.profiles p
              WHERE p.user_id = auth.uid()
                AND p.is_active IS TRUE
                AND p.deleted_at IS NULL
           ) THEN 'membership_revoked'
           WHEN NOT EXISTS (
             SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
           ) THEN 'roles_revoked'
           ELSE 'active'
         END;
$$;

REVOKE ALL ON TABLE public.sicoob_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sicoob_invitation_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.sicoob_invitations TO authenticated;
GRANT SELECT ON TABLE public.sicoob_invitation_events TO authenticated;

REVOKE ALL ON FUNCTION public.sicoob_actor_is_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sicoob_inviter_can_issue(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_issue_invitation(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_sicoob_invitation(text, uuid, uuid, public.app_role, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_sicoob_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_sicoob_invitation(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_sicoob_invitation(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_sicoob_user_access(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_sicoob_access_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_is_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_issue_invitation(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_sicoob_invitation(text, uuid, uuid, public.app_role, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_invitation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_sicoob_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_sicoob_invitation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_sicoob_user_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_access_state() TO authenticated;
