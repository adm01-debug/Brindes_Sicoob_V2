-- Harden log_quote_action
ALTER FUNCTION public.log_quote_action(uuid, text, jsonb) SET search_path = public;

-- Harden qa_preflight_check
ALTER FUNCTION public.qa_preflight_check() SET search_path = public;

-- Harden seed_qa_scenario
ALTER FUNCTION public.seed_qa_scenario(text) SET search_path = public;
