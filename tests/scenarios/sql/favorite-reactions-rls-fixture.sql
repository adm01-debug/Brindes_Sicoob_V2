CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TYPE public.app_role AS ENUM ('admin');
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT _role = 'admin'::public.app_role
     AND _user_id = 'cccccccc-0000-4000-8000-000000000003'::uuid
$$;

CREATE TABLE public.favorite_lists (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  shared_token text,
  shared_expires_at timestamptz
);
CREATE TABLE public.favorite_item_reactions (
  id uuid PRIMARY KEY,
  item_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.favorite_lists(id),
  anon_id text NOT NULL,
  emoji text NOT NULL,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_item_reactions ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.favorite_lists TO anon, authenticated;
GRANT SELECT, INSERT ON public.favorite_item_reactions TO anon, authenticated;

CREATE POLICY favorite_lists_owner_admin_select
  ON public.favorite_lists FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );
CREATE POLICY favorite_lists_public_select
  ON public.favorite_lists FOR SELECT TO anon, authenticated
  USING (shared_token IS NOT NULL);

CREATE POLICY sicoob_merged_reactions_select
  ON public.favorite_item_reactions AS PERMISSIVE FOR SELECT TO public
  USING (
    (pg_has_role(current_user, 'anon', 'member') AND EXISTS (
      SELECT 1 FROM public.favorite_lists AS list
       WHERE list.id = favorite_item_reactions.list_id
         AND list.shared_token IS NOT NULL
    ))
    OR
    (pg_has_role(current_user, 'authenticated', 'member') AND EXISTS (
      SELECT 1 FROM public.favorite_lists AS list
       WHERE list.id = favorite_item_reactions.list_id
         AND list.shared_token IS NOT NULL
    ))
  );
CREATE POLICY sicoob_merged_reactions_insert
  ON public.favorite_item_reactions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    pg_has_role(current_user, 'anon', 'member')
    OR pg_has_role(current_user, 'authenticated', 'member')
  );

INSERT INTO public.favorite_lists (id, user_id, shared_token) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', repeat('a', 64)),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', repeat('b', 64));
INSERT INTO public.favorite_item_reactions
  (id, item_id, list_id, anon_id, emoji, user_agent, ip_hash)
VALUES
  ('aaaaaaaa-1000-4000-8000-000000000001', 'aaaaaaaa-2000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'visitor-a-001', '👍', 'browser-a', 'hash-a'),
  ('aaaaaaaa-1000-4000-8000-000000000002', 'aaaaaaaa-2000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'visitor-a-002', '🔥', 'browser-b', 'hash-b'),
  ('bbbbbbbb-1000-4000-8000-000000000003', 'bbbbbbbb-2000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'visitor-b-001', '❤️', 'browser-c', 'hash-c');

CREATE FUNCTION public.get_public_favorite_reactions(_token text, _anon_id text)
RETURNS TABLE(item_id uuid, emoji text, anon_id text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT reaction.item_id,
         reaction.emoji,
         CASE WHEN reaction.anon_id = left(_anon_id, 160)
              THEN left(_anon_id, 160) ELSE '' END
    FROM public.favorite_lists AS list
    JOIN public.favorite_item_reactions AS reaction ON reaction.list_id = list.id
   WHERE length(_token) = 64
     AND list.shared_token = _token
     AND (list.shared_expires_at IS NULL OR list.shared_expires_at > statement_timestamp())
$$;
REVOKE ALL ON FUNCTION public.get_public_favorite_reactions(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_favorite_reactions(text, text) TO anon, authenticated;
