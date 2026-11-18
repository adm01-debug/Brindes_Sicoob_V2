CREATE OR REPLACE FUNCTION public.log_mockup_prompt_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.prompt_text IS DISTINCT FROM NEW.prompt_text OR OLD.ai_model IS DISTINCT FROM NEW.ai_model) THEN
    NEW.version := OLD.version + 1;
    INSERT INTO public.mockup_prompt_history (
      config_id, config_key, old_prompt, new_prompt, ai_model, version, changed_by
    ) VALUES (
      NEW.id, NEW.config_key, OLD.prompt_text, NEW.prompt_text, NEW.ai_model, NEW.version, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$function$
