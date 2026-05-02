# 🎯 Alinhamento de Escopo: Portal Sicoob Brindes

Este documento formaliza a direção estratégica do projeto, mapeando as funcionalidades do inventário legado para o novo sistema "Greenfield" Sicoob.

---

## 🚀 1. Funcionalidades MAPEADAS (Prioridade Máxima)

Estas funcionalidades são fundamentais para o sucesso do Portal Sicoob e estão em desenvolvimento ou planejadas.

### 📦 Operação de Pedidos (Onda A)
- **Workflow Expandido**: `em_producao` → `em_separacao` → `em_transporte` → `entregue` → `concluido`.
- **Logística & Tracking**: Integração com transportadoras, códigos de rastreio e fotos de comprovante de entrega.
- **Auditoria**: Timeline completa de eventos por pedido (Triggers automáticos).
- **Aprovação de Mockups**: Fluxo de aprovação de piloto com revisões (`pending`, `approved`, `rejected`, `revision`).

### 🛍️ Catálogo & Produtos
- **Filtros Avançados**: Por tiragem, estoque, cor, categoria e técnica de gravação.
- **Hierarquia de Categorias**: Suporte a categorias pai-filho (Árvore de categorias).
- **Kits de Produtos**: Composição visual de kits e orçamentos agrupados.
- **Virtualização**: Grid de produtos de alta performance (`TanStack Virtual`).

### 🤖 Inteligência Artificial
- **Geração de Mockups**: Motor de IA para aplicar logos em produtos automaticamente.
- **Análise de Logo**: Extração de cores e sugestão de técnicas compatíveis.
- **Busca Semântica**: Busca por intenção (Ex: "brindes para evento sustentável").

### 🔐 Estrutura Sicoob (Multi-tenant)
- **RBAC Customizado**: Roles específicas (`admin`, `gestor_compras`, `gerente_pa`, `vendedor`).
- **Organizações**: Estrutura hierárquica (Singular > PA > Verbas).

---

## 🚫 2. Funcionalidades IGNORADAS (Fora de Escopo / Legado)

Estas funcionalidades foram identificadas no inventário, mas **NÃO** serão implementadas no Portal Sicoob para manter o foco e a simplicidade.

### 🔌 Integrações Legadas
- **Bitrix24 (CRM)**: O projeto é Greenfield. A sincronização com Bitrix do sistema antigo não será replicada.
- **109 Tabelas Externas**: O esquema de banco de dados foi simplificado e otimizado para Supabase, ignorando tabelas redundantes do sistema anterior.

### 🛡️ Segurança de Redundância
- **IP Restriction / Geo-Blocking**: Por ser um sistema interno/corporativo Sicoob, estas restrições de rede pública são consideradas de baixa prioridade ou desnecessárias no momento.
- **WebAuthn / 2FA**: A autenticação será centralizada no Supabase Auth padrão (Email/SSO Sicoob).

### 🎮 Gamificação & Rewards
- **Achievements / Seller Gamification**: Funcionalidades de gamificação para vendedores do sistema antigo foram removidas do escopo inicial para focar na operação transacional.

---

## 📊 3. Mapeamento de Transição

| Funcionalidade Legada | Abordagem Sicoob | Status |
|-----------------------|------------------|--------|
| `customization_price_tables` | Lógica de `tier_pricing` no `order_items` | ✅ Mapeado |
| `mockup_approval_links` | `order_pilot_approvals` (Workflow nativo) | ✅ Mapeado |
| `bitrix_clients` | Tabela `clients` nativa no Supabase | ✅ Mapeado |
| `geo_allowed_countries` | Ignorado (Acesso restrito Brasil/Sicoob) | 🚫 Ignorado |
| `seller_gamification` | Ignorado (Foco em performance operacional) | 🚫 Ignorado |

---

**Diretriz Final**: O Portal Sicoob deve ser leve, focado na experiência do vendedor e na agilidade da aprovação de orçamentos e pedidos.
