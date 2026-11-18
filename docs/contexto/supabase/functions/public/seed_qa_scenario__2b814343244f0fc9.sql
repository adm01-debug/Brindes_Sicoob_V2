CREATE OR REPLACE FUNCTION public.seed_qa_scenario(scenario_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN jsonb_build_object('scenario', scenario_name, 'status', 'success', 'timestamp', now());
END;
$function$
