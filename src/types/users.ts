import { type AppRole } from "@/lib/roles";

export type { AppRole };

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  is_active: boolean | null;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  cooperativa_id: string | null;
  pa_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
  preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
