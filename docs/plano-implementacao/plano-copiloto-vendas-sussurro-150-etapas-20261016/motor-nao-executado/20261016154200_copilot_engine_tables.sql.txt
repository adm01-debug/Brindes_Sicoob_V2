-- Migration: Copilot Engine Tables (E056-E080)
-- Cria tabelas para o motor de análise, gerador de sugestões e contexto de orçamentos

-- ============================================================
-- copilot_conversations: estado COOPERA por conversa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  crm_contact_id        UUID,  -- FK opcional para contatos do CRM
  channel               TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp | email | chat
  coopera_state         JSONB NOT NULL DEFAULT '{
    "C": {"status":"pendente","value":null},
    "O_orcamento": {"status":"pendente","value":null},
    "O_ocasiao": {"status":"pendente","value":null},
    "P": {"status":"pendente","value":null},
    "E": {"status":"pendente","value":null},
    "R": {"status":"pendente","value":null},
    "A": {"status":"pendente","value":null}
  }'::jsonb,
  ai_risk_level         TEXT NOT NULL DEFAULT 'low' CHECK (ai_risk_level IN ('low','medium','high','critical')),
  sentiment             TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative','urgent')),
  last_analyzed_at      TIMESTAMPTZ,
  analysis_count        INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- copilot_messages: mensagens da conversa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copilot_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('seller','contact','system')),
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- copilot_insights: sinais de compra e alertas de risco
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copilot_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('buying_signal','risk_flag','info')),
  content         TEXT NOT NULL,
  confidence      NUMERIC(3,2) DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- copilot_suggestions: sugestões de próxima mensagem
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copilot_suggestions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('reply','question','action')),
  content             TEXT NOT NULL,
  rationale           TEXT,
  next_action_type    TEXT CHECK (next_action_type IN ('send_reply','ask_question','send_quote','schedule_call')),
  priority            INT NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  ghost_text          TEXT,
  used_at             TIMESTAMPTZ,
  dismissed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- copilot_events: auditoria de eventos do motor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copilot_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL, -- llm_called | suggestion_used | quote_generated | insight_dismissed
  payload_hash    TEXT,          -- SHA-256 do payload, sem conteúdo
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- copilot_contacts: vínculo entre conversa e histórico CRM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.copilot_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  crm_contact_id  UUID,
  name            TEXT,
  phone           TEXT,
  email           TEXT,
  org_name        TEXT,
  purchase_history JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id)
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_copilot_messages_conversation ON public.copilot_messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_insights_conversation ON public.copilot_insights(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_suggestions_conversation ON public.copilot_suggestions(conversation_id, priority);
CREATE INDEX IF NOT EXISTS idx_copilot_events_conversation ON public.copilot_events(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_org ON public.copilot_conversations(org_id, updated_at DESC);

-- ============================================================
-- Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_copilot_conversation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copilot_conv_updated_at ON public.copilot_conversations;
CREATE TRIGGER trg_copilot_conv_updated_at
  BEFORE UPDATE ON public.copilot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_copilot_conversation_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_contacts ENABLE ROW LEVEL SECURITY;

-- Apenas service role acessa diretamente (edge functions usam service key)
CREATE POLICY "service_role_all_copilot_conversations"
  ON public.copilot_conversations FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_copilot_messages"
  ON public.copilot_messages FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_copilot_insights"
  ON public.copilot_insights FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_copilot_suggestions"
  ON public.copilot_suggestions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_copilot_events"
  ON public.copilot_events FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_copilot_contacts"
  ON public.copilot_contacts FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Usuários autenticados acessam conversas da própria org
CREATE POLICY "authenticated_read_copilot_conversations"
  ON public.copilot_conversations FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_read_copilot_messages"
  ON public.copilot_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT cc.id FROM public.copilot_conversations cc
      JOIN public.organization_members om ON om.organization_id = cc.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_read_copilot_suggestions"
  ON public.copilot_suggestions FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT cc.id FROM public.copilot_conversations cc
      JOIN public.organization_members om ON om.organization_id = cc.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_read_copilot_insights"
  ON public.copilot_insights FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT cc.id FROM public.copilot_conversations cc
      JOIN public.organization_members om ON om.organization_id = cc.org_id
      WHERE om.user_id = auth.uid()
    )
  );
