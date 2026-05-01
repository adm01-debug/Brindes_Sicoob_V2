import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Passkey {
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

// Helper functions for base64url encoding/decoding
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS Device";
  if (/Android/.test(ua)) return "Android Device";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux PC";
  return "Unknown Device";
}

export function useWebAuthn() {
  const { toast } = useToast();
  const [isSupported] = useState(() => {
    return (
      typeof window !== "undefined" &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === "function"
    );
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);

  // Check if platform authenticator is available (Face ID, Touch ID, Windows Hello)
  const checkPlatformAuthenticator = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }, [isSupported]);

  // Fetch user's registered passkeys
  const fetchPasskeys = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_passkeys")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPasskeys((data as Passkey[]) || []);
      return data as Passkey[];
    } catch (error) {
      console.error("Error fetching passkeys:", error);
      return [];
    }
  }, []);

  // Register a new passkey
  const registerPasskey = useCallback(
    async (userId: string, userEmail: string): Promise<boolean> => {
      if (!isSupported) {
        toast({
          variant: "destructive",
          title: "Não suportado",
          description: "Seu navegador não suporta WebAuthn/Passkeys",
        });
        return false;
      }

      setIsLoading(true);
      try {
        const challenge = generateChallenge();
        const deviceName = getDeviceName();

        // Get existing credentials to exclude
        const existingPasskeys = await fetchPasskeys(userId);
        const excludeCredentials = existingPasskeys.map((pk) => ({
          id: base64urlToArrayBuffer(pk.credential_id),
          type: "public-key" as const,
          transports: (pk.transports as AuthenticatorTransport[]) || [],
        }));

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
          {
            challenge,
            rp: {
              name: "Brindes Sicoob",
              id: window.location.hostname,
            },
            user: {
              id: new TextEncoder().encode(userId),
              name: userEmail,
              displayName: userEmail.split("@")[0],
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" }, // ES256
              { alg: -257, type: "public-key" }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "preferred",
            },
            timeout: 60000,
            attestation: "none",
            excludeCredentials,
          };

        const credential = (await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        })) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error("Falha ao criar credencial");
        }

        const response = credential.response as AuthenticatorAttestationResponse;

        // Extract and store the credential
        const credentialId = arrayBufferToBase64url(credential.rawId);
        const publicKey = arrayBufferToBase64url(response.getPublicKey()!);
        const transports = response.getTransports?.() || [];

        const { error } = await supabase.from("user_passkeys").insert({
          user_id: userId,
          credential_id: credentialId,
          public_key: publicKey,
          device_name: deviceName,
          transports,
          counter: 0,
        });

        if (error) throw error;

        await fetchPasskeys(userId);

        toast({
          title: "Passkey registrada!",
          description: `${deviceName} foi adicionado como método de autenticação`,
        });

        return true;
      } catch (error: unknown) {
        console.error("Error registering passkey:", error);
        const err = error instanceof Error ? error : new Error('Unknown error');

        if (err.name === "NotAllowedError") {
          toast({
            variant: "destructive",
            title: "Cancelado",
            description: "Registro de passkey foi cancelado",
          });
        } else if (err.name === "InvalidStateError") {
          toast({
            variant: "destructive",
            title: "Já registrado",
            description: "Este dispositivo já possui uma passkey registrada",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao registrar",
            description: err.message || "Não foi possível registrar a passkey",
          });
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, toast, fetchPasskeys]
  );

  // Authenticate with passkey
  const authenticateWithPasskey = useCallback(
    async (email: string): Promise<{ success: boolean; userId?: string }> => {
      if (!isSupported) {
        toast({
          variant: "destructive",
          title: "Não suportado",
          description: "Seu navegador não suporta WebAuthn/Passkeys",
        });
        return { success: false };
      }

      setIsLoading(true);
      try {
        const challenge = generateChallenge();

        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
          {
            challenge,
            rpId: window.location.hostname,
            userVerification: "required",
            timeout: 60000,
          };

        const credential = (await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions,
          mediation: "optional",
        })) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error("Nenhuma credencial selecionada");
        }

        const credentialId = arrayBufferToBase64url(credential.rawId);

        // Find the passkey in database
        const { data: passkey, error: findError } = await supabase
          .from("user_passkeys")
          .select("*")
          .eq("credential_id", credentialId)
          .single();

        if (findError || !passkey) {
          throw new Error("Passkey não encontrada");
        }

        // Update last used
        await supabase
          .from("user_passkeys")
          .update({ 
            last_used_at: new Date().toISOString(),
            counter: (passkey.counter || 0) + 1 
          })
          .eq("id", passkey.id);

        return { success: true, userId: passkey.user_id };
      } catch (error: unknown) {
        console.error("Error authenticating with passkey:", error);
        const err = error instanceof Error ? error : new Error('Unknown error');

        if (err.name === "NotAllowedError") {
          toast({
            variant: "destructive",
            title: "Cancelado",
            description: "Autenticação foi cancelada",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro de autenticação",
            description: err.message || "Não foi possível autenticar com passkey",
          });
        }
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, toast]
  );

  // Delete a passkey
  const deletePasskey = useCallback(
    async (passkeyId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("user_passkeys")
          .delete()
          .eq("id", passkeyId);

        if (error) throw error;

        setPasskeys((prev) => prev.filter((pk) => pk.id !== passkeyId));

        toast({
          title: "Passkey removida",
          description: "A passkey foi removida com sucesso",
        });

        return true;
      } catch (error: unknown) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível remover a passkey",
        });
        return false;
      }
    },
    [toast]
  );

  // Check if user has any registered passkeys
  const hasPasskeys = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const { count, error } = await supabase
          .from("user_passkeys")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (error) throw error;
        return (count || 0) > 0;
      } catch {
        return false;
      }
    },
    []
  );

  return {
    isSupported,
    isLoading,
    passkeys,
    checkPlatformAuthenticator,
    fetchPasskeys,
    registerPasskey,
    authenticateWithPasskey,
    deletePasskey,
    hasPasskeys,
  };
}
