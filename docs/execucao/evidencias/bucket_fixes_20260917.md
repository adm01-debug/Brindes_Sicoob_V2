# Correção dos 2 buckets errados — Etapa 16, 17/09/2026

- `mockup-assets` → `mockup-art-files` em `src/lib/mockup-storage.ts` (2 usos + comentário) e `src/components/mockup/approval/OffscreenLayoutCapture.tsx` (2 usos). `grep -rn "mockup-assets" src/` limpo.
- `personalization` → `personalization-images` em `src/services/OrderService.ts::uploadPilotPhoto` (2 usos).

**Ressalva não resolvida nesta rodada (`OrderService.uploadPilotPhoto`):** o bucket `personalization-images` é **privado** (`public=false`, confirmado na auditoria de 17/09; só `personalization-images-secondary` é público). O código usa `getPublicUrl()`, que funciona para qualquer bucket mas só produz uma URL realmente acessível sem autenticação se o bucket for público — em bucket privado, `getPublicUrl()` retorna uma URL que não resolve para quem não tem sessão/policy de leitura. Como `uploadPilotPhoto` só é chamado por `PilotApprovalPanel.tsx`, confirmado código morto (zero importadores), não há impacto em produção hoje. Se esse componente for reativado, alguém precisa decidir entre: (a) usar `createSignedUrl()` em vez de `getPublicUrl()`, ou (b) apontar para `personalization-images-secondary` (público) em vez da primária. Não decidi isso sozinho — só troquei o nome do bucket inexistente pelo mais correto dos dois existentes, sem resolver a semântica de visibilidade.

**Teste de runtime:** não executado (`npm run dev` não rodado nesta sessão); confirmação foi só por leitura de código + grep.
