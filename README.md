# 🎁 Brindes Sicoob V2 — Portal corporativo de brindes em construção

> Portal B2B em construção para catálogo e solicitações de brindes das cooperativas Sicoob. Código presente no repositório não comprova integração ativa, implantação, aceite comercial ou operação em produção.

[![Stack](https://img.shields.io/badge/Stack-React%2018%20%2B%20TypeScript%205%20%2B%20Supabase-blue)]()
[![Build](https://img.shields.io/badge/Build-Vite%205-purple)]()
[![Design](https://img.shields.io/badge/UI-Tailwind%20CSS%20%2B%20shadcn%2Fui-cyan)]()

---

## 📋 Sumário

- [🛡️ Relatório de Auditoria](#-relatório-de-auditoria)
- [🎯 Visão Geral](#-visão-geral)
- [🛠 Stack Tecnológico](#-stack-tecnológico)
- [🏗 Arquitetura](#-arquitetura)
- [🚀 Setup Local](#-setup-local)
- [📁 Estrutura de Pastas](#-estrutura-de-pastas)
- [📦 Módulos Principais](#-módulos-principais)
- [🔐 Autenticação e Autorização](#-autenticação-e-autorização)
- [🗄 Banco de Dados](#-banco-de-dados)
- [⚡ Edge Functions](#-edge-functions)
- [🔌 Integrações](#-integrações)
- [📝 Convenções de Código](#-convenções-de-código)
- [🚢 Deploy](#-deploy)
- [🔧 Troubleshooting](#-troubleshooting)

---

## 🛡️ Relatório de Auditoria

O sistema está em construção e passa por auditorias de segurança, banco,
contratos e experiência. O progresso técnico local mais recente é de 30/10/2026:

- 📄 **[Progresso do plano — 30/10/2026](./docs/execucao/progresso-plano-2026-10-30.md)** — lote de correções e validações locais. Não fecha o plano nem prova implantação remota.

- 📄 **[Execução e preflight do banco — 01/10/2026](./docs/execucao/execucao-plano-2026-10-01.md)** — registro histórico; não representa estado atual do banco remoto.

- 📄 **[Revisão das 150 etapas e dos workflows — 01/10/2026](./docs/execucao/revisao-do-plano-2026-10-01.md)** — implementação atual, falha de autorização reproduzida e limites de validação do banco.

- 📄 **[Revisão dos planos — 27/09/2026](./docs/execucao/revisao-do-plano-2026-09-27.md)** — avanços em main, lacunas reproduzidas e limites de implantação.

- 📄 **[Auditoria de validação — 22/09/2026](./docs/auditoria-validacao-2026-09-22.md)**

---

## 🎯 Visão Geral

**Brindes Sicoob V2** é um portal B2B em construção para cooperativas, marketing,
aprovadores e compradores do Sicoob. Módulos presentes no código incluem:

- **Catálogo** conectado ao banco externo de produtos para consulta; cobertura, disponibilidade e atualização dependem do ambiente.
- **Simulação de preços** e **criação de orçamentos**, sujeitas à validação de contratos e jornadas autenticadas.
- **Aprovação pública de orçamento** por token; a migration de redação de campos internos está versionada, mas ainda não aplicada em banco remoto.
- **Montagem de kits** e ferramentas de mockup; o assistente `AIMockupAssistant` atualmente usa respostas simuladas, não IA generativa.
- **Assistentes e integrações de IA** cuja disponibilidade depende de funções e credenciais configuradas.
- **Tendências/BI** em modo demonstração por padrão; não tratar dados exibidos como métricas reais sem desativar o demo e validar a fonte.
- **E-mail transacional** ainda não implementado: a Edge Function correspondente responde HTTP 501.

---

## 🛠 Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **Estilização** | Tailwind CSS 3, shadcn/ui, Framer Motion |
| **Estado** | TanStack Query (server state), Zustand (client state) |
| **Backend** | Supabase (Auth, DB, Storage, Edge Functions) |
| **Banco Externo** | PostgreSQL via Edge Function bridge (Promobrind) |
| **IA** | Integrações configuráveis; disponibilidade e modelo ativo dependem do ambiente |
| **Integrações** | Bitrix24 CRM, n8n automações, ElevenLabs TTS |
| **Testes** | Vitest, Testing Library |

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────┐
│                   Frontend (SPA)                 │
│  React 18 + TypeScript + TanStack Query          │
├─────────────────────────────────────────────────┤
│              Supabase Edge Functions             │
│  expert-chat │ external-db-bridge │ mockup-gen   │
├──────────┬──────────┬───────────────────────────┤
│ Supabase │ External │ Integrações               │
│ Database │ DB (PG)  │ Bitrix24 · n8n · ElevenLabs│
└──────────┴──────────┴───────────────────────────┘
```

### Padrões Arquiteturais

- **Feature-based** — código organizado por funcionalidade, não por tipo
- **Hooks como camada de lógica** — separação clara entre UI e lógica de negócio
- **Edge Functions como BFF** — backend leve para integrações e AI
- **Schema-first** — tipos gerados automaticamente do banco (`supabase gen types`)

---

## 🚀 Setup Local

### Pré-requisitos

- Node.js 24+
- npm

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd Brindes_Sicoob_V2

# Instale dependências
npm install

# Configure variáveis de ambiente
# O .env é gerado automaticamente pelo Lovable Cloud

# Rode o servidor de desenvolvimento
npm run dev
```

### Comandos Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run test` | Executar testes com Vitest |
| `npm run test:coverage` | Testes com relatório de cobertura |

---

## 📁 Estrutura de Pastas

```
src/
├── assets/           # Imagens e assets estáticos
├── components/       # Componentes React organizados por feature
│   ├── admin/        # Painel administrativo (produtos, BI, cadastros)
│   ├── catalog/      # Catálogo de produtos (grid, lista, tabela)
│   ├── compare/      # Comparador de produtos
│   ├── errors/       # Error boundaries (global + rota)
│   ├── expert/       # Flow — Assistente IA (chat, filtros)
│   │   └── chat/     # Componentes do chat (Header, MessageList, InputBar)
│   ├── filters/      # Sistema de filtros avançados
│   ├── kit-builder/  # Montador de kits customizados
│   ├── layout/       # Layout principal, sidebar, header
│   ├── mockup/       # Gerador de mockups com IA
│   ├── orders/       # Gestão de pedidos
│   ├── products/     # Cards, quick view, detalhes de produto
│   ├── quotes/       # Criador de orçamentos + aprovação
│   ├── search/       # Busca global (Command Palette)
│   ├── seo/          # Meta tags e SEO
│   ├── simulator/    # Simulador de preços de personalização
│   ├── ui/           # Componentes base (shadcn/ui)
│   └── voice/        # Agente de voz (orb, overlay)
├── contexts/         # React Contexts (Auth, etc.)
├── hooks/            # Custom hooks (dados, filtros, estado)
├── integrations/     # Supabase client e tipos (auto-gerados)
├── lib/              # Utilitários, serviços, helpers
│   ├── external-db/  # Bridge para banco externo
│   ├── logger.ts     # Logger estruturado
│   └── personalization/ # Engine de cálculo de personalização
├── pages/            # Páginas/rotas da aplicação
├── stores/           # Zustand stores
└── types/            # Tipos TypeScript globais

supabase/
├── config.toml       # Configuração do projeto Supabase
├── functions/        # 106 Edge Functions com entrypoint
│   ├── _shared/      # Utilitários compartilhados (CORS, auth, validação)
│   ├── expert-chat/  # Assistente IA
│   ├── external-db-bridge/ # Bridge para consulta ao banco externo
│   └── ...
└── migrations/       # 589 arquivos SQL no snapshot local de 30/10/2026; não equivale ao ledger remoto
```

---

## 📦 Módulos Principais

### 1. Catálogo (`/` e `/filtros`)
- Busca, filtros e apresentação em layouts disponíveis no código; a paridade completa entre layouts não está certificada.
- Catálogo externo é fonte de consulta de produto/estoque; não deve ser alterado pelo portal.
- Não há garantia documentada de renderização eficiente de 20 mil itens ou de cobertura completa do deep linking.

### 2. Simulador de Preços (`/simulador`)
- Wizard de 4 etapas: Local → Grupo → Variação → Configuração
- Cálculo de personalização com faixas de quantidade
- Comparação visual entre técnicas e fornecedores
- Persistência e recuperação de rascunhos precisam ser confirmadas na jornada autenticada do ambiente-alvo.

### 3. Criador de Orçamentos (`/orcamentos/novo`)
- Stepper animado de 6 etapas com micro-interações
- Versionamento e aprovação pública por token implementados no código; a aprovação e migrations pendentes ainda precisam de validação no projeto isolado.
- Exportação PDF profissional

### 4. Assistentes
- O repositório contém assistentes e integrações distintas; disponibilidade depende de configuração e respostas verificadas da função correspondente.
- `AIMockupAssistant` usa um conjunto local de respostas simuladas e não deve ser apresentado como IA generativa operacional.

### 5. Montador de Kits (`/montar-kit`)
- Drag-and-drop de produtos
- Preview visual do kit com cálculo de volume
- Estimativas logísticas precisam de validação com transportadora e dados reais antes de uso comercial.
- Compartilhamento via link público

### 6. Dashboard BI (`/bi`)
- Gráficos de BI e análise de tendências; o módulo de tendências usa dados de demonstração por padrão.
- Nenhuma métrica deve ser interpretada como dado real sem validar a fonte e o modo do ambiente.
- Top produtos, categorias e fornecedores
- Exportação de relatórios

---

## 🔐 Autenticação e Autorização

### Auth
- Supabase Auth com email/senha e verificação obrigatória
- Google OAuth como login social
- Refresh automático de tokens via `AuthContext`
- Sign-up desativado (plataforma fechada/convite)
- Controles de segurança devem ser verificados por workflow e configuração do ambiente; a lista de funcionalidades não comprova sua ativação.

### RBAC
- Papéis e escopos devem ser consultados no schema e nas políticas vigentes; não assuma que esta lista resume todos os papéis do projeto.
- Tabela `user_roles` com enum `app_role`
- Função `has_role()` (SECURITY DEFINER) para queries sem recursão RLS
- Tabela `role_permissions` para permissões granulares
- `AdminRoute` wrapper para proteção de rotas sensíveis

### RLS
- RLS é auditada por gates estáticos e remotos; a comprovação do ambiente exige credenciais administrativas e execução verde do workflow de compliance
- Policies baseadas em `auth.uid()` e `has_role()`
- O isolamento entre organizações exige validação de RLS no projeto de homologação; não é certificado apenas por esta documentação.

---

## 🗄 Banco de Dados

### Supabase (Interno)
- Schema gerido por migrations; há 589 arquivos SQL no snapshot local deste README (30/10/2026). O ledger e schema remoto precisam de reconciliação antes de deploy.
- Tipos gerados automaticamente (`supabase gen types`)
- Connection pooling via Supabase pooler

### Banco Externo (Promobrind)
- Acesso via Edge Function `external-db-bridge`
- Cache em memória com TTL de 10 minutos
- Fallback progressivo para resiliência
- Retry com backoff exponencial

---

## ⚡ Edge Functions

106 Edge Functions com entrypoint no snapshot local de 30/10/2026, classificadas no manifesto de autorização; isso não informa quantas estão publicadas remotamente:

| Categoria | Funções |
|---|---|
| **IA** | `expert-chat`, `generate-ad-image`, `generate-mockup-*` |
| **Dados** | `external-db-bridge`, `fetch-product-details` |
| **Auth** | `verify-email`, `rate-limit-check` |
| **Integrações** | `bitrix-*`, `webhook-dispatcher` |
| **Utilitários** | `generate-pdf`, `send-email`, `tts-*` |

### Padrões
- CORS com allowlist restritiva (`_shared/cors.ts`)
- Autenticação via JWT (`authenticateRequest()`)
- Validação de input com Zod (`_shared/validate.ts`)
- Error handling estruturado com try/catch

---

## 🔌 Integrações

| Sistema | Uso | Protocolo |
|---|---|---|
| **Bitrix24** | CRM, contatos, deals | REST API + OAuth2 |
| **n8n** | Automações (webhooks, emails) | Webhooks |
| **ElevenLabs** | Text-to-Speech no Agente de Voz | WebSocket |
| **Serviços de IA** | Integrações presentes no código; configuração/funcionamento dependem de credenciais e do endpoint por recurso | HTTP/API |

---

## 📝 Convenções de Código

### TypeScript
- `strict: true` está configurado; o repositório ainda controla dívida histórica por baseline e bloqueia novas regressões
- Zero `any` (exceto em type guards justificados)
- Return types explícitos em funções públicas
- Validação runtime com Zod nas Edge Functions

### Componentes
- `forwardRef` obrigatório em componentes de UI reutilizáveis
- Hooks como camada de lógica (não lógica em JSX)
- Máximo ~200 linhas por arquivo (extrair sub-componentes)
- Semantic tokens do design system (nunca cores hardcoded)

### Logging
- `logger.info/warn/error` (nunca `console.log` em produção)
- Logs estruturados com contexto

---

## 🚢 Publicação

O repositório não contém workflow de release do frontend. O procedimento de Edge Functions e migrations está descrito em [DEPLOYMENT.md](./docs/DEPLOYMENT.md); ele restringe operações remotas ao projeto isolado de construção e não comprova publicação ativa. Confirme o provedor e o ambiente antes de qualquer deploy.

---

## 🔧 Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| "Failed to fetch dynamically imported module" | Cache do browser com chunks antigos | `EnhancedErrorBoundary` faz auto-recovery. Se persistir, Ctrl+Shift+R |
| Produtos não carregam | Limite de 1000 rows ou timeout do banco externo | Verificar paginação e status do `external-db-bridge` |
| "new row violates row-level security" | Usuário não autenticado ou sem permissão | Verificar token JWT e policies RLS |
| Edge Function timeout | Queries pesadas ou API externa lenta | Verificar logs da função |
| Tela branca após deploy | Chunk loading error | Limpar cache do navegador e recarregar |

---

## 📊 Métricas do Projeto

| Métrica | Valor |
|---|---|
| Edge Functions com entrypoint no snapshot local de 30/10/2026 | 106 |
| Arquivos SQL em `supabase/migrations` no snapshot local de 30/10/2026 | 589 (não equivale ao ledger remoto) |
| Suíte local da revisão | 5.856 aprovados, 68 ignorados; ver SHA e limites em [RELATORIO_CI.md](./RELATORIO_CI.md) |
| RLS | Há gates estáticos e workflow remoto; não certifica o banco sem execução e credenciais do projeto-alvo |

---

## 📜 Licença

Projeto proprietário — todos os direitos reservados.

---

**Portal Brindes Sicoob V2 — em construção.**
