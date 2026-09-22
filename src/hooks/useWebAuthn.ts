// WebAuthn precisa de desafio de uso único e verificação da assinatura no servidor.
// O fluxo antigo comparava somente credential_id e podia declarar um user_id
// autenticado sem verificar resposta, origem, RP ID ou contador.
// Mantemos a interface até a integração segura com Supabase Auth estar pronta.
export interface Passkey {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name: string | null;
  transports: string[] | null;
  created_at: string;
  last_used_at: string | null;
}

const indisponivel = async (_value?: string, _extra?: string) => false;
const nenhumaPasskey = async (_userId: string): Promise<Passkey[]> => [];
const autenticacaoNegada = async (_email: string): Promise<{ success: boolean; userId?: string }> => ({ success: false });

export function useWebAuthn() {
  return {
    isSupported: false,
    isLoading: false,
    passkeys: [] as Passkey[],
    checkPlatformAuthenticator: indisponivel,
    fetchPasskeys: nenhumaPasskey,
    registerPasskey: indisponivel,
    authenticateWithPasskey: autenticacaoNegada,
    deletePasskey: indisponivel,
    hasPasskeys: indisponivel,
  };
}
