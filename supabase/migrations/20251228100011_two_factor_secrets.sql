-- Migration: two_factor_secrets
-- Description: 2FA secrets
-- Created: 2025-12-28

CREATE TABLE two_factor_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_two_factor_secrets_created ON two_factor_secrets(created_at DESC);

-- RLS
ALTER TABLE two_factor_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view two_factor_secrets"
  ON two_factor_secrets FOR SELECT
  USING (true);
