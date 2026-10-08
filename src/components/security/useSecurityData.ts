/**
 * useSecurityData — Hook que carrega métricas, logins e alertas de segurança
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { use2FA } from '@/hooks/use2FA';
import { useAllowedIPs } from '@/hooks/useAllowedIPs';

export interface SecurityMetrics {
  score: number;
  mfaEnabled: boolean;
  ipRestrictionsActive: boolean;
  knownDevicesCount: number;
  recentLoginAttempts: number;
  failedLoginAttempts: number;
  securityAlerts: number;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  success: boolean;
  failure_reason: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const defaultMetrics: SecurityMetrics = {
  score: 0, mfaEnabled: false, ipRestrictionsActive: false,
  knownDevicesCount: 0, recentLoginAttempts: 0, failedLoginAttempts: 0, securityAlerts: 0,
};

interface SecuritySnapshot {
  attempts: LoginAttempt[];
  notifications: SecurityNotification[];
  devicesCount: number;
}

async function fetchSecuritySnapshot(userId: string): Promise<SecuritySnapshot> {
  const [{ data: attempts }, { count: devicesCount }, { data: notifications }] = await Promise.all([
    supabase.from("login_attempts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_known_devices").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("notifications").select("*").eq("user_id", userId).eq("type", "security").order("created_at", { ascending: false }).limit(10),
  ]);
  return {
    attempts: (attempts as LoginAttempt[] | null) ?? [],
    notifications: (notifications as SecurityNotification[] | null) ?? [],
    devicesCount: devicesCount ?? 0,
  };
}

interface MetricsContext {
  snapshot: SecuritySnapshot;
  mfaAvailable: boolean;
  mfaEnabled: boolean;
  allowedIpCount: number;
}

function calculateMetrics({ snapshot, mfaAvailable, mfaEnabled, allowedIpCount }: MetricsContext): SecurityMetrics {
  const failedAttempts = snapshot.attempts.filter(attempt => !attempt.success).length;
  let score = 40;
  if (mfaAvailable && mfaEnabled) score += 30;
  if (allowedIpCount > 0) score += 20;
  if (snapshot.devicesCount > 0) score += 10;
  if (failedAttempts > 5) score -= 10;
  return {
    score: Math.min(100, Math.max(0, score)), mfaEnabled,
    ipRestrictionsActive: allowedIpCount > 0, knownDevicesCount: snapshot.devicesCount,
    recentLoginAttempts: snapshot.attempts.length, failedLoginAttempts: failedAttempts,
    securityAlerts: snapshot.notifications.filter(notification => !notification.is_read).length,
  };
}

export function useSecurityData(effectiveUserId: string | undefined, isManagingOther: boolean, selectedUserId: string | null) {
  const { is2FAEnabled, isLoading: is2FALoading, error: mfaError } = use2FA(isManagingOther ? selectedUserId ?? undefined : undefined);
  const mfaStatusAvailable = !isManagingOther && !mfaError;
  const { allowedIPs } = useAllowedIPs();
  const [metrics, setMetrics] = useState<SecurityMetrics>(defaultMetrics);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSecurityData = useCallback(async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      const snapshot = await fetchSecuritySnapshot(effectiveUserId);
      setLoginAttempts(snapshot.attempts);
      setNotifications(snapshot.notifications);
      setMetrics(calculateMetrics({ snapshot, mfaAvailable: mfaStatusAvailable, mfaEnabled: is2FAEnabled, allowedIpCount: allowedIPs.length }));
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId, is2FAEnabled, mfaStatusAvailable, allowedIPs]);

  useEffect(() => { if (effectiveUserId) loadSecurityData(); }, [effectiveUserId, loadSecurityData]);

  return { metrics, loginAttempts, notifications, isLoading, is2FAEnabled, is2FALoading, mfaStatusAvailable, allowedIPs };
}

// Score helpers
export function getScoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  if (score >= 40) return 'text-orange';
  return 'text-destructive';
}

export function getScoreProgressColor(score: number) {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  if (score >= 40) return 'bg-orange';
  return 'bg-destructive';
}

export function getScoreLabel(score: number) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Crítico';
}
