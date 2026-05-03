-- Create storage bucket for exports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the exports bucket
CREATE POLICY "Users can view their own export files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Actually, for simplicity in the prototype, we let users see files in the exports bucket if they have the link
CREATE POLICY "Public Access to exports" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'exports');

-- Enable pg_net for edge function calls if not already
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job to call the process-batch-export edge function
-- Replace <PROJECT_ID> and <ANON_KEY> with actual values or use a more robust way
-- For this environment, we'll just define the job. The actual execution depends on the platform.
SELECT cron.schedule(
    'process-export-queue',
    '* * * * *', -- every minute
    $$
    SELECT
      net.http_post(
        url := 'https://bojgeppypmtormfjsyun.supabase.co/functions/v1/process-batch-export',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
);
