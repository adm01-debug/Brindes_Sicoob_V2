# ADR 0006 — Separação de Papéis: Admin vs Dev

**Status:** Accepted · **Date:** 2026-05-03

## Contexto
O sistema cresceu em complexidade técnica. O papel `admin` (administrativo/negócio) não deve ter acesso a ferramentas de infraestrutura, telemetria bruta ou configurações de segurança sensíveis para evitar erros operacionais e reduzir a superfície de ataque em caso de comprometimento de conta administrativa.

## Decisão
Implementar uma separação clara entre **Operação de Negócio** (`admin`) e **Operação Técnica** (`dev`).

- **Papel `dev`:** Super-usuário com acesso a todas as rotas de infraestrutura (`/admin/telemetria`, `/admin/seguranca`, `/admin/conexoes`, `/admin/workflows`, etc.).
- **Papel `admin`:** Acesso a gestão de usuários (`/admin/usuarios`), cadastros de negócio e CMS.
- **Proteção:** Uso do componente `<DevRoute>` e helpers `isDevOnlyPath` / `isAdminOnlyPath` no frontend.
- **SSOT de Rotas:** Centralizado em `src/lib/navigation/restricted-routes.ts`.

## Consequências
- ✅ Maior segurança: admins não podem rotacionar chaves de API acidentalmente.
- ✅ Redução de ruído: dashboards administrativos ficam focados em KPIs de negócio.
- ⚠️ Exige que desenvolvedores tenham o papel `dev` atribuído explicitamente via banco de dados (`user_roles`).
