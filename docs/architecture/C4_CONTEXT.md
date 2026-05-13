# 🌐 Diagrama C4 — Arquitetura do Sistema

Este documento descreve a arquitetura do Promo Gifts em múltiplos níveis de detalhe (C4 Model).

## Nível 1: Contexto do Sistema
Descreve o ecossistema de alto nível e suas integrações.

```mermaid
graph TD
    User((Usuário: Vendedor/Admin))
    PublicUser((Cliente Final))
    System[Promo Gifts App]
    
    subgraph External_Systems [Ecossistema Externo]
        Bitrix[Bitrix24 CRM]
        N8N[n8n Workflows]
        Providers[APIs de Fornecedores]
    end
    
    User -->|Navega/Cota| System
    PublicUser -->|Aprova Cotação| System
    System -->|Push Quote| Bitrix
    N8N -->|Ingere Dados| System
    N8N -->|Sincroniza| Bitrix
    Bitrix -->|Webhook| N8N
    N8N -->|Fetch| Providers
```

---

## Nível 2: Contêineres
Detalha os componentes internos do Promo Gifts App.

```mermaid
graph TD
    subgraph Promo_Gifts_App [Promo Gifts App]
        UI[Single Page Application - React/Vite]
        Edge[Supabase Edge Functions - Deno]
        DB[(PostgreSQL - Supabase)]
        Storage[Storage - Supabase Assets]
    end

    User((Usuário)) -->|HTTPS/REST| UI
    UI -->|JSON/RPC| Edge
    UI -->|PostgREST/RLS| DB
    UI -->|Direct Upload| Storage
    
    Edge -->|Query| DB
    Edge -->|Auth Verification| DB
    Edge -->|External API| Bitrix[Bitrix24]
    Edge -->|External DB| ExtDB[(Bancos Externos: Catálogo/CRM)]
```

---

## Nível 3: Componentes (Edge Functions)
Detalha a lógica interna das Edge Functions.

```mermaid
graph TD
    subgraph Edge_Functions_Logic [Edge Functions]
        Bridge[CRM/Catalog Bridge]
        AuthHook[Auth Integrity Hook]
        Sync[Bitrix Sync Service]
        Security[Anti-Scraping / Rate Limit]
    end

    UI --> Bridge
    UI --> Security
    AuthHook -->|Verify| DB
    Bridge -->|invokeExternalDb| ExtDB
    Sync -->|OAuth2| Bitrix
```

## Entidades Principais
- **User**: Atua no front-office (venda) ou back-office (gestão).
- **SPA (React)**: Container de interface, gerencia estado complexo e caching (React Query).
- **Edge Functions**: Camada de federação de dados e segurança, protegendo chaves de bancos externos.
- **DB Local**: Mantém orçamentos, roles, configurações e cache de integridade.
- **n8n**: O "maestro" do backend, garantindo que o catálogo esteja sempre atualizado via APIs de fornecedores.
