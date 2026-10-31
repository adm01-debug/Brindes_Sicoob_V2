export interface UserCredentials {
  email: string | undefined;
  password: string | undefined;
}

type CredentialEnvironment = Record<string, string | undefined>;

/** Mantém o storageState principal alinhado à identidade usada por loginAs(user). */
export function getUserCredentials(env: CredentialEnvironment): UserCredentials {
  const viewerEmail = env.E2E_VIEWER_EMAIL;
  const viewerPassword = env.E2E_VIEWER_PASSWORD;
  if (viewerEmail && viewerPassword) {
    return { email: viewerEmail, password: viewerPassword };
  }

  return {
    email: env.E2E_USER_EMAIL,
    password: env.E2E_USER_PASSWORD,
  };
}
