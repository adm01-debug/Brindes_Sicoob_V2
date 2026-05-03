# Inventário Exaustivo de Funcionalidades v2 — Promo Gifts

> Documento técnico-executivo atualizado em 2026-05-03.
> Reflete o estado real da plataforma Promo Gifts (Catálogo B2B + Vertical Sicoob).

## 1. Resumo Executivo
A **Promo Gifts** é uma plataforma B2B dual-mode (Catálogo Geral + Especialização Sicoob) de alta performance.

**Números Reais:**
- **~80+ páginas/rotas** (Públicas, Catálogo, App, Sicoob, Admin, Dev)
- **150+ hooks customizados**
- **600+ componentes** modulares
- **~80 tabelas** no banco de dados com RLS estrito
- **~40 Edge Functions** (IA, Integrações, Automações, Segurança)
- **5 perfis de acesso** (`admin`, `vendedor`, `gestor_compras`, `gerente_pa`, `dev`)

## 2. Visão Geral do Sistema
Plataforma multi-tenant com separação lógica e visual via **Skins Factory**. 
- **SSOT:** Banco de dados externo para dados de produtos e estoque.
- **Multimodal:** Suporte a áudio, IA generativa e assistentes conversacionais.

## 3. Perfis de Usuário e Governança
| Papel | Escopo | Rotas Chave |
|-------|--------|-------------|
| **`gerente_pa`** | Operação de Postos de Atendimento Sicoob | `/dashboard-pa`, `/meus-pedidos` |
| **`gestor_compras`** | Aprovação e gestão de verbas | `/gestor/*`, `/dashboard-gerencial` |
| **`vendedor`** | Gestão de pedidos, logística e CRM | `/vendedor/*`, `/painel-kpis` |
| **`admin`** | Gestão de usuários, catálogo e CMS | `/admin/usuarios`, `/admin/cadastros` |
| **`dev`** | Operações técnicas, segurança e telemetria | `/admin/telemetria`, `/admin/seguranca` |

## 4. Módulos de Destaque (Não mapeados na v1)
- **Comparação 10/10:** Score IA, radar de atributos, duel mode, share público.
- **Coleções & Favoritos:** Paridade total, listas públicas, reações anônimas.
- **Kit Maker:** Wizard de montagem de kits com motion design 10/10.
- **Magic Up Advertising:** Geração automática de banners e criativos via IA.
- **Quote Builder:** Precisão de 4 casas decimais, assinatura eletrônica, aprovação pública.
- **CRM Bridge:** Integração bidirecional com Bitrix24 e SalesPro.
- **MCP Security:** Gestão de chaves, auditoria de uso e auto-revogação por papel.
- **App Health:** Telemetria em tempo real, health dashboard e monitoramento de latência.

## 5. Arquitetura de Segurança e Observabilidade
- **RLS First:** Políticas em todas as tabelas, audit trail imutável.
- **MFA Enforcement:** Autorização baseada em AAL2 e step-up tokens.
- **Observabilidade:** Logs estruturados, correlação via X-Request-Id, alertas Sentry via monitor cron.
- **Anti-Scraping:** Detecção de bots, rate limiting agressivo e proteção contra hotlinking.

## 6. Stack de IA (Lovable AI Gateway)
- **Busca Semântica:** Embeddings para busca por similaridade.
- **Recomendações:** Motor de sugestões baseado em perfil e histórico.
- **Mockup IA:** Geração de provas digitais automáticas.
- **Voice Agent:** Assistente de voz com priming de áudio e baixa latência.

---
*Este inventário é a fonte de verdade para a governança do projeto.*
