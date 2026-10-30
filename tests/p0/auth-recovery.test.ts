/**
 * P0 — contratos de recuperação de autenticação.
 *
 * Edge Functions Deno não podem ser importadas pelo Vitest. Nesses casos o
 * teste valida, no código implantável, o encadeamento completo das guardas e
 * dos efeitos que compõem o contrato de segurança.
 */
import { describe, expect, it } from "vitest";
import { expectContract, expectInOrder, source } from "./_contracts";

describe("P0 — recuperação de autenticação", () => {
  it("login: uma falha do Auth sempre libera novamente o formulário", () => {
    const authPage = source("src/pages/Auth.tsx");

    expectInOrder(authPage, [
      "setIsSubmitting(true)",
      "const { error } = await signIn(data.email, data.password)",
      "} finally {",
      "setIsSubmitting(false)",
    ]);
    expectContract(authPage, [
      "aria-busy={isSubmitting || authLoading}",
      /disabled=\{isSubmitting \|\| authLoading\}/,
    ]);
  });

  it("sessão expirada: preserva a rota solicitada e aceita somente retorno interno", () => {
    const guard = source("src/components/layout/ProtectedRoute.tsx");
    const authPage = source("src/pages/Auth.tsx");

    expectContract(guard, ['<Navigate to="/login" state={{ from: location }} replace />']);
    expectContract(authPage, [
      "const from = (state as RedirectSource | null)?.from",
      /safeInternalPath\s*\(\s*requestedPath\s*\(\s*searchParams,\s*location\.state\s*\)/s,
    ]);
  });

  it("logout global: exige papel privilegiado e confirmação antes de revogar sessões", () => {
    const handler = source("supabase/functions/force-global-logout/index.ts");

    expectInOrder(handler, [
      'req.headers.get("Authorization")',
      'roles.includes("admin")',
      'body.confirm !== "FORCE_LOGOUT_ALL"',
      "auth.admin.listUsers",
      'auth.admin.signOut(u.id, "global")',
    ]);
    expectContract(handler, [
      "if (u.id === caller.id) continue",
      "kept_caller: caller.id",
    ]);
  });

  it("redefinição de senha: valida recuperação, atualiza credencial e só então conclui", () => {
    const reset = source("src/pages/ResetPassword.tsx");

    expectInOrder(reset, [
      "const [isCheckingToken, setIsCheckingToken] = useState(true)",
      "supabase.auth.getSession()",
      "event === 'PASSWORD_RECOVERY'",
      "supabase.auth.updateUser",
      "setIsSuccess(true)",
    ]);
    expectContract(reset, [
      "if (isCheckingToken)",
      "if (!isValidToken)",
      "if (isSuccess)",
      "setIsSubmitting(false)",
    ]);
  });

  it("MFA: código TOTP inválido não alimenta o contador de senha", () => {
    const challenge = source("src/components/security/MfaChallengeDialog.tsx");
    const passwordRateLimit = source("src/hooks/useLoginRateLimit.ts");

    expectContract(challenge, [
      "supabase.auth.mfa.challenge({ factorId })",
      /supabase\.auth\.mfa\.verify\s*\(\s*\{\s*factorId,\s*challengeId:\s*challenge\.id,\s*code,?\s*\}\s*\)/s,
      /toast\.error\(["']Código inválido["']/,
      /setCode\(["']["']\)/,
    ]);
    expect(challenge).not.toContain("recordFailedAttempt");
    expect(passwordRateLimit).toContain("export function recordFailedAttempt");
  });

  it("plataforma fechada: não publica rota de cadastro e aceita entrada por convite", () => {
    const routes = source("src/routes/config/public.ts");

    expectContract(routes, [
      'path: "/login"',
      'path: "/convite/:token"',
      'import("@/pages/sicoob/SicoobInvitationAcceptPage")',
    ]);
    expect(routes).not.toMatch(/path:\s*["']\/(?:signup|register|cadastro)["']/i);
  });

  it("novo dispositivo ou IP: persiste ambos os registros de notificação", () => {
    const handler = source("supabase/functions/detect-new-device/index.ts");

    expectInOrder(handler, [
      '.from("user_known_devices")',
      ".maybeSingle()",
      "if (isNewDevice || isNewIP)",
      '.from("device_login_notifications")',
      '.from("workspace_notifications")',
    ]);
    expectContract(handler, [
      "existingDevice.ip_address !== clientIP",
      'title: isNewDevice ? "Novo dispositivo detectado" : "Novo IP detectado"',
    ]);
  });
});
