import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
// HMR: ensure this module re-binds to the latest AuthContext singleton after edits.

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  currentRole: OrgMember["role"] | null;
  isLoading: boolean;
  switchOrganization: (orgId: string) => void;
  createOrganization: (name: string, slug: string) => Promise<Organization | null>;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

const orgStorageKey = (userId: string) => `selected_org_id:${userId}`;

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<OrgMember["role"] | null>(null);
  const membershipsRef = useRef<Map<string, OrgMember["role"]>>(new Map());
  const requestVersionRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    const userId = user?.id;
    if (!userId) {
      setOrganizations([]);
      setCurrentOrg(null);
      setCurrentRole(null);
      membershipsRef.current = new Map();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setOrganizations([]);
    setCurrentOrg(null);
    setCurrentRole(null);
    membershipsRef.current = new Map();
    try {
      // Fetch orgs via members join
      const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", userId);

      if (membersError) throw membersError;
      if (requestVersion !== requestVersionRef.current) return;

      if (!members || members.length === 0) {
        setOrganizations([]);
        setCurrentOrg(null);
        setCurrentRole(null);
        membershipsRef.current = new Map();
        useRecentlyViewedStore.getState().setScope(`user:${userId}`);
        setIsLoading(false);
        return;
      }

      const orgIds = members.map((m) => m.organization_id);

      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds)
        .eq("is_active", true);

      if (orgsError) throw orgsError;
      if (requestVersion !== requestVersionRef.current) return;

      const orgList = (orgs || []) as Organization[];
      const rolesByOrg = new Map<string, OrgMember["role"]>();
      for (const member of members) {
        rolesByOrg.set(member.organization_id, member.role as OrgMember["role"]);
      }
      membershipsRef.current = rolesByOrg;
      setOrganizations(orgList);

      // Restore saved org or pick first, ensuring the user actually belongs to it
      localStorage.removeItem("selected_org_id");
      const savedOrgId = localStorage.getItem(orgStorageKey(userId));
      const savedOrg = orgList.find((o) => o.id === savedOrgId);
      const selected = savedOrg || orgList[0] || null;

      setCurrentOrg(selected);

      if (selected) {
        setCurrentRole(rolesByOrg.get(selected.id) || null);
        localStorage.setItem(orgStorageKey(userId), selected.id);
        useRecentlyViewedStore.getState().setScope(`user:${userId}:org:${selected.id}`);
      } else {
        localStorage.removeItem(orgStorageKey(userId));
        useRecentlyViewedStore.getState().setScope(`user:${userId}`);
      }
    } catch (err) {
      if (requestVersion !== requestVersionRef.current) return;
      console.error("Failed to fetch organizations:", err);
      setOrganizations([]);
      setCurrentOrg(null);
      setCurrentRole(null);
      membershipsRef.current = new Map();
      useRecentlyViewedStore.getState().setScope(`user:${userId}`);
    } finally {
      if (requestVersion === requestVersionRef.current) setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrganizations();
    return () => {
      requestVersionRef.current += 1;
    };
  }, [fetchOrganizations]);

  const switchOrganization = useCallback(
    (orgId: string) => {
      const org = organizations.find((o) => o.id === orgId);
      if (org) {
        // Prevent redundant state updates
        if (currentOrg?.id === orgId) return;

        const role = membershipsRef.current.get(orgId);
        // A organização e sua permissão vêm da mesma leitura de memberships.
        // Atualizá-las no mesmo evento evita renderizar a organização nova com
        // o papel da anterior enquanto uma segunda consulta está em trânsito.
        if (!role) return;
        setCurrentRole(role);
        setCurrentOrg(org);
        if (user?.id) {
          localStorage.setItem(orgStorageKey(user.id), orgId);
          useRecentlyViewedStore.getState().setScope(`user:${user.id}:org:${orgId}`);
        }
      }
    },
    [organizations, currentOrg?.id, user?.id]
  );

  const createOrganization = useCallback(
    async (name: string, slug: string): Promise<Organization | null> => {
      if (!user) return null;

      // Use atomic RPC to create org + add owner in a single transaction
      const { data: orgId, error } = await supabase.rpc(
        "create_organization_with_owner",
        { _name: name, _slug: slug }
      );

      if (error) {
        console.error("Failed to create organization:", error);
        return null;
      }

      // A leitura seguinte seleciona a organização recém-criada a partir da
      // chave do próprio usuário; chamar switchOrganization aqui usaria a
      // lista do render anterior, pois a atualização de estado é assíncrona.
      localStorage.setItem(orgStorageKey(user.id), orgId);
      await fetchOrganizations();

      // Return the org from the freshly fetched list
      return organizations.find((o) => o.id === orgId) || ({ id: orgId, name, slug } as Organization);
    },
    [user, fetchOrganizations, organizations]
  );

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        currentRole,
        isLoading,
        switchOrganization,
        createOrganization,
        refetch: fetchOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return ctx;
}
