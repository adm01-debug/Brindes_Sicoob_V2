CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, user_id uuid, full_name text, pa_id uuid);
CREATE TABLE public.sicoob_orders(id uuid PRIMARY KEY, pa_id uuid);
CREATE TABLE public.sicoob_approval_requests(id uuid PRIMARY KEY, order_id uuid REFERENCES public.sicoob_orders(id), requester_id uuid, status text DEFAULT 'pending', amount_at_request numeric, request_reason text, metadata jsonb DEFAULT '{}'::jsonb);
CREATE TABLE public.pa_notification_settings(id uuid PRIMARY KEY, pa_id uuid, channel text, webhook_url text, recipient_email text, is_active boolean DEFAULT true);
INSERT INTO public.profiles VALUES ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Pessoa sintética','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.sicoob_orders VALUES ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
-- O PA do solicitante é diferente: a entrega deve seguir o PA do pedido.
INSERT INTO public.pa_notification_settings VALUES
('33333333-3333-4333-8333-333333333333','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','slack','https://hooks.slack.com/services/sintetico',NULL,true),
('44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','email',NULL,'qa@example.invalid',true),
('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','email',NULL,'outro@example.invalid',true);
