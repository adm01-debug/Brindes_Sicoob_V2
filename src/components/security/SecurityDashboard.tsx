/**
 * SecurityDashboard — painel de segurança da conta.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AdminUserSelector,
  buildSecurityRecommendations,
  SecurityOverview,
  SecurityRecommendations,
  SecurityTabs,
} from './SecurityDashboardSections';
import { useSecurityData, type UserProfile } from './useSecurityData';

function useAdminProfiles(isAdmin: boolean): UserProfile[] {
  const [users, setUsers] = useState<UserProfile[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (data) setUsers(data);
      });
  }, [isAdmin]);
  return users;
}

export function SecurityDashboard() {
  const { user, isAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const users = useAdminProfiles(isAdmin);
  const effectiveUserId = selectedUserId || user?.id;
  const isManagingOther = Boolean(selectedUserId) && selectedUserId !== user?.id;
  const selectedUser = users.find((profile) => profile.user_id === selectedUserId);
  const security = useSecurityData(effectiveUserId, isManagingOther, selectedUserId);

  const recommendations = buildSecurityRecommendations(
    security.mfaStatusAvailable,
    security.is2FAEnabled,
    security.allowedIPs.length,
    security.metrics.failedLoginAttempts,
  );

  return (
    <div className="space-y-6">
      <AdminUserSelector
        visible={isAdmin}
        users={users}
        currentUserId={user?.id}
        selectedUserId={selectedUserId}
        selectedUser={selectedUser}
        managingOther={isManagingOther}
        onSelect={setSelectedUserId}
      />
      <SecurityOverview
        metrics={security.metrics}
        managingOther={isManagingOther}
        selectedUser={selectedUser}
        mfaAvailable={security.mfaStatusAvailable}
        mfaEnabled={security.is2FAEnabled}
        allowedIpCount={security.allowedIPs.length}
      />
      <SecurityRecommendations recommendations={recommendations} />
      <SecurityTabs
        loginAttempts={security.loginAttempts}
        notifications={security.notifications}
        managingOther={isManagingOther}
        selectedUserId={selectedUserId}
        selectedUser={selectedUser}
      />
    </div>
  );
}
