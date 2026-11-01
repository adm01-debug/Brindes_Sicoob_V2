# Módulo Sicoob - Documentação de Usuários de Teste

Este documento descreve as credenciais e configurações para o ambiente de teste do módulo Sicoob.

## Variáveis de Ambiente (Opcionais)

As seguintes variáveis podem ser configuradas no Supabase/Lovable Secrets para sobrescrever os valores padrão:

| Variável | Descrição | Valor Padrão |
|----------|-----------|--------------|
| `SICOOB_TEST_USER_PASSWORD` | Senha comum para todos os usuários | `password123` |
| `SICOOB_TEST_EMAIL_PA` | Email do usuário nível PA | `pa@teste.com` |
| `SICOOB_TEST_EMAIL_SINGULAR` | Email do usuário nível Singular | `singular@teste.com` |
| `SICOOB_TEST_EMAIL_CENTRAL` | Email do usuário nível Central | `central@teste.com` |
| `SICOOB_TEST_EMAIL_GESTOR` | Email do usuário Gestor Comercial | `gestor@teste.com` |

## Estrutura de Teste Criada pelo Seed

O comando de seed (`/sicoob-seed`) garante a existência da seguinte topologia:

### 1. Organização
- **Central:** CENTRAL TESTE (Código: 0001) — registrada em `sicoob_centrais`.
- **Singular:** SINGULAR TESTE (Código: 0002) - Vinculada à Central (`cooperativas.central_id`).
- **Posto de Atendimento:** PA TESTE 01 (Código: 01) - Vinculado à Singular.

### 2. Papéis e Permissões
Os papéis seguem o enum `app_role` (hierarquia: dev > gestor_compras > comprador_singular > gerente_pa > comprador_pac) e são gravados em `user_roles` (fonte de verdade) e espelhados em `profiles.role`.
- **gerente_pa** (usuário PA): Acesso restrito aos pedidos do próprio PA.
- **comprador_singular** (usuário Singular): Acesso aos pedidos de todos os PAs vinculados à sua Singular.
- **gestor_compras** (usuário Central): Aprovação de alçada e visão gerencial da Singular. Não existe papel de nível Central no sistema; a Central é apenas organização.
- **supervisor** (usuário Gestor): Gestão comercial Promo Brindes, acesso a todas as cooperativas.

## Como Recriar o Ambiente

Para resetar ou criar os usuários, envie uma requisição POST para a Edge Function:
`POST /functions/v1/sicoob-seed` (Requer Service Role Key).
