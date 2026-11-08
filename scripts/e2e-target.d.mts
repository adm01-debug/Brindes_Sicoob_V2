export interface E2ETargetConfig {
  url?: string;
  projectId?: string;
  allowedProjectId?: string;
  publishableKey?: string;
  serviceRoleKey?: string;
}

export function validateE2ETarget(config: E2ETargetConfig): { projectId: string };
