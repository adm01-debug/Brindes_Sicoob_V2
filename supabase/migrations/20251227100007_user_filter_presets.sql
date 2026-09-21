CREATE TABLE IF NOT EXISTS user_filter_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  context TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_filters_user ON user_filter_presets(user_id);
CREATE INDEX idx_user_filters_context ON user_filter_presets(context);

ALTER TABLE user_filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own filters"
  ON user_filter_presets FOR ALL
  USING (auth.uid() = user_id);
