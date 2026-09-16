-- Migration: template_versions
-- Description: Template versioning
-- Created: 2025-12-28

CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_template_versions_created ON template_versions(created_at DESC);

-- RLS
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template_versions"
  ON template_versions FOR SELECT
  USING (true);
