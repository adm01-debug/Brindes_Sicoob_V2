-- Migration: feature_flags
-- Description: Feature toggles
-- Created: 2025-12-28

CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_flags_created ON feature_flags(created_at DESC);

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feature_flags"
  ON feature_flags FOR SELECT
  USING (true);
