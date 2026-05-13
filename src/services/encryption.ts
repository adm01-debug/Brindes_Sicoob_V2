
/**
 * Encryption Service (App Layer)
 * Provides AES-GCM encryption/decryption for sensitive data.
 * Used to protect PII before storage in accordance with P2 audit gap.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Derives a key from a password/secret using PBKDF2.
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(secret, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(data)
  );

  // Combine salt + iv + encrypted data into a single base64 string
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encryptedBase64: string, secret: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  const key = await deriveKey(secret, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * High-level helper for PII fields.
 * Uses a default app secret if none provided (should be configured in env).
 */
export async function protectPII(value: string): Promise<string> {
  const secret = import.meta.env.VITE_APP_ENCRYPTION_KEY || 'sicoob-fallback-secret-2026';
  return encryptData(value, secret);
}

export async function revealPII(encrypted: string): Promise<string> {
  const secret = import.meta.env.VITE_APP_ENCRYPTION_KEY || 'sicoob-fallback-secret-2026';
  try {
    return await decryptData(encrypted, secret);
  } catch (err) {
    console.error("Failed to decrypt PII:", err);
    return "[ENCRYPTED]";
  }
}
