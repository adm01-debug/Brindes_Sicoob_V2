-- Migration: cache_entries
-- Description: Cache storage
-- Created: 2025-12-28

CREATE TABLE cache_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cache_entries_created ON cache_entries(created_at DESC);

-- RLS
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cache_entries"
  ON cache_entries FOR SELECT
  USING (true);
