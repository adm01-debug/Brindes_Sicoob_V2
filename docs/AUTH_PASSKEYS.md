# 🔐 Autenticação: Passkeys (WebAuthn) — Guia de Implementação Full 10/10

Este documento descreve como atingir a nota 10/10 em Autenticação através da implementação completa de Passkeys com verificação server-side.

## Gaps Atuais (Nota 9.5)
- [x] Detecção client-side (WebAuthn API).
- [x] Registro de credenciais no banco `user_passkeys`.
- [ ] **Verificação de Assinatura Server-side**: O sistema atualmente confia na resposta do cliente sem verificar o desafio (challenge) no backend.
- [ ] **Integração Nativa Supabase Auth**: Uso de `supabase.auth.signInWithSSO` ou `mfa.challenge` nativo.

## Roadmap de Implementação

### 1. Desafio (Challenge) no Backend
O desafio deve ser gerado no servidor, armazenado temporariamente e verificado após a assinatura do cliente.
- Criar Edge Function `webauthn-challenge` que gera um buffer randômico e salva no Redis ou DB vinculado à sessão.

### 2. Verificação de Atestação (Registro)
Ao registrar uma nova Passkey, o backend deve verificar:
- O `challenge` assinado.
- A origem (hostname) para evitar phishing.
- O formato da chave pública.

### 3. Verificação de Asserção (Login)
No login, o backend verifica:
- O contador de uso (prevenção de replay attacks).
- A validade da assinatura contra a chave pública armazenada.

## Proposta Técnica (Edge Function)
Utilizar a biblioteca `@simplewebauthn/server` em uma Edge Function Supabase para realizar a validação pesada.

```typescript
// Exemplo de verificação no Edge
import { verifyRegistrationResponse } from '@simplewebauthn/server';

const verification = await verifyRegistrationResponse({
  response: body.credential,
  expectedChallenge: storedChallenge,
  expectedOrigin: 'https://seudominio.com',
  expectedRPID: 'seudominio.com',
});

if (verification.verified) {
  // Salva a chave pública definitiva
}
```

## Benefícios
- **Phishing-resistant**: Passkeys são imunes a phishing tradicional.
- **UX**: Login instantâneo via Face ID / Touch ID.
- **MFA Nível 2**: Pode ser usado como segundo fator (AAL2).
