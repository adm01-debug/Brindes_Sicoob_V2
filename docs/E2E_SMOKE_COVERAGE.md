# E2E Smoke Test Coverage Matrix (v2026-05)

Este documento mapeia os fluxos críticos da plataforma e o status de automação de testes E2E (Playwright).

## 1. Fluxo de Autenticação
| ID | Cenário | Status | Tag |
|---|---|---|---|
| AUTH-01 | Login com credenciais válidas | ✅ Coberto | `@smoke` |
| AUTH-02 | Bloqueio após 5 tentativas falhas | ✅ Coberto | `@security` |
| AUTH-03 | Recuperação de senha em 3 fases | ✅ Coberto | `@auth` |
| AUTH-04 | Login Social (Google) | ⚠️ Pendente | `@external` |

## 2. Fluxo Sicoob (Workflow Alçada)
| ID | Cenário | Status | Tag |
|---|---|---|---|
| SICOOB-01 | Criação de pedido dentro do limite | ✅ Coberto | `@smoke` `@sicoob` |
| SICOOB-02 | Bloqueio de pedido acima do limite | ✅ Coberto | `@smoke` `@sicoob` |
| SICOOB-03 | Aprovação de pedido pelo Gestor | ✅ Coberto | `@sicoob` `@manager` |
| SICOOB-04 | Rejeição de pedido pelo Gestor | ✅ Coberto | `@sicoob` `@manager` |
| SICOOB-05 | Notificação de status de aprovação | ⚠️ Em progresso | `@notif` |

## 3. Catálogo & Carrinho
| ID | Cenário | Status | Tag |
|---|---|---|---|
| CAT-01 | Busca de produto por palavra-chave | ✅ Coberto | `@smoke` |
| CAT-02 | Filtro por cor/tamanho | ✅ Coberto | `@catalog` |
| CAT-03 | Adição de kit personalizado ao carrinho | ✅ Coberto | `@kit` |
| CAT-04 | Aplicação de desconto por volume | ✅ Coberto | `@pricing` |

## 4. Admin & Telemetria
| ID | Cenário | Status | Tag |
|---|---|---|---|
| ADM-01 | Acesso restrito a rotas admin | ✅ Coberto | `@security` |
| ADM-02 | Visualização de logs de auditoria | ✅ Coberto | `@audit` |
| ADM-03 | Configuração de verbas por PA | ✅ Coberto | `@sicoob` |
| ADM-04 | Exportação de logs CSV/PDF | ✅ Coberto | `@telemetry` |

---
**Status Geral: 85% de Cobertura Crítica**
*Atualizado em: 2026-05-03*
