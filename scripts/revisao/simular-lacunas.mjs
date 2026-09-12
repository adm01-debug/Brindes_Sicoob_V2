/** Reproduz achados da revisão com módulos reais e dependências simuladas, sem rede. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resultados = [];
function carregar(arquivo, dependencias = {}) {
  const fonte = fs.readFileSync(path.join(raiz, arquivo), 'utf8');
  const codigo = ts.transpileModule(fonte, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }, fileName: arquivo }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, { exports, console, Date, Map, Set, JSON,
    require(nome) {
      if (!(nome in dependencias)) throw new Error(`Dependência não simulada: ${nome}`);
      return dependencias[nome];
    },
  }, { filename: arquivo, timeout: 5000 });
  return exports;
}
async function cenario(id, descricao, executar) {
  const observado = await executar();
  resultados.push({ id, descricao, resultado: 'lacuna_reproduzida', observado });
}

await cenario('A01', 'Serviço de status rejeita o contrato usado pela aba de logística', async () => {
  let chamadas = 0;
  const { sicoobOrderService } = carregar('src/services/sicoob/orderService.ts', {
    '@/integrations/supabase/client': { supabase: { auth: { getUser() { chamadas++; } } } },
    '@/types/sicoob/orders': { canSicoobTransitionTo: () => true },
  });
  await assert.rejects(sicoobOrderService.updateOrderStatus('pedido-simulado', 'logistic'), /status atual é obrigatório/);
  assert.equal(chamadas, 0);
  return 'Rejeição antes de qualquer acesso ao banco quando currentStatus é omitido.';
});

await cenario('A04', 'Autosave sinaliza salvo apesar de erro retornado pelo Supabase', async () => {
  const setters = [], callbacks = [];
  const react = {
    useState(valor) { const indice = setters.length; setters.push([]); return [valor, v => setters[indice].push(v)]; },
    useRef: v => ({ current: v }), useEffect() {},
    useCallback(fn) { callbacks.push(fn); return fn; },
  };
  const resposta = { data: null, error: { message: 'Falha simulada de persistência' } };
  const consulta = { update() { return this; }, eq() { return this; }, then(resolver) { resolver(resposta); } };
  const { useKitAutoSave } = carregar('src/hooks/useKitAutoSave.ts', {
    react, '@/integrations/supabase/client': { supabase: { from: () => consulta } },
    '@/contexts/AuthContext': { useAuth: () => ({ user: { id: 'usuario-simulado' } }) },
    sonner: { toast: {} }, '@/lib/logger': { logger: { warn() {} } },
  });
  useKitAutoSave({ items: [{ id: 'produto', quantity: 1 }], personalization: {}, totalPrice: 10 }, 1, 'kit-simulado');
  await callbacks[0]();
  assert.equal(setters[0].length, 1);
  assert.ok(setters[0][0] instanceof Date);
  return 'lastSavedAt recebe uma data mesmo com data=null e error preenchido; nenhuma rede utilizada.';
});

await cenario('A05', 'Estoque de outra cor cobre indevidamente a falta da variante selecionada', async () => {
  const { useKitStockValidation } = carregar('src/hooks/useKitStockValidation.ts', {
    '@tanstack/react-query': { useQuery: () => ({ data: [
      { product_id: 'produto', color_name: 'Verde', stock_quantity: 0 },
      { product_id: 'produto', color_name: 'Azul', stock_quantity: 100 },
    ], isLoading: false }) },
    '@/lib/external-db/bridge': { invokeExternalDb() { throw new Error('Rede proibida nesta simulação'); } },
  });
  const resultado = useKitStockValidation([{ id: 'produto', name: 'Copo verde', sku: 'V', selectedColor: { name: 'Verde' }, quantity: 1 }], null, 50);
  assert.equal(resultado.hasStockIssues, false);
  assert.equal(resultado.stockByProduct.get('produto'), 100);
  return '50 unidades solicitadas; verde=0 e azul=100; hook retorna hasStockIssues=false.';
});

await cenario('A05b', 'Erro na consulta de estoque não aparece no contrato retornado ao consumidor', async () => {
  const { useKitStockValidation } = carregar('src/hooks/useKitStockValidation.ts', {
    '@tanstack/react-query': { useQuery: () => ({ data: undefined, isLoading: false, isError: true, error: new Error('Consulta indisponível') }) },
    '@/lib/external-db/bridge': {},
  });
  const resultado = useKitStockValidation([{ id: 'produto', quantity: 1 }], null, 50);
  assert.equal(resultado.hasStockIssues, false);
  assert.equal('error' in resultado || 'isError' in resultado, false);
  return 'Consulta com erro retorna alertas vazios sem expor error/isError; isso não comprova estoque disponível.';
});

await cenario('A10', 'Redação de campos não remove custos retornados pelos aliases do catálogo', async () => {
  const { redactInternalCatalogFields } = carregar('supabase/functions/_shared/catalog-redaction.ts');
  const resultado = redactInternalCatalogFields({ cost_price: 8, tecnica: { setup_cost: 23, unit_cost: 4 } });
  assert.equal('cost_price' in resultado, false);
  assert.equal(resultado.tecnica.setup_cost, 23);
  assert.equal(resultado.tecnica.unit_cost, 4);
  return 'A lista remove cost_price, mas preserva setup_cost/unit_cost; alcance remoto e política comercial ainda precisam de validação.';
});

await cenario('A03', 'Componente de recompra navega para destino sem registro no mapa de rotas', async () => {
  const destinos = [];
  const { OneClickReorder } = carregar('src/components/orders/OneClickReorder.tsx', {
    react: { useState: v => [v, () => {}] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragmento' },
    lucide: {}, 'lucide-react': { RotateCcw: 'icone', Loader2: 'espera' },
    '@/components/ui/button': { Button: 'botao' }, sonner: { toast: { success() {}, error() {} } },
    'react-router-dom': { useNavigate: () => destino => destinos.push(destino) },
    '@/hooks/orders/useOrders': { useOrders: () => ({ duplicateOrder: async () => ({ id: 'novo-pedido' }) }) },
  });
  await OneClickReorder({ orderId: 'pedido-simulado' }).props.onClick({ stopPropagation() {} });
  assert.equal(destinos[0], '/pedidos/novo-pedido/editar');
  const rotas = fs.readdirSync(path.join(raiz, 'src/routes/config')).filter(f => /\.tsx?$/.test(f)).map(f => fs.readFileSync(path.join(raiz, 'src/routes/config', f), 'utf8')).join('\n');
  assert.equal(/path:\s*["']\/pedidos\//.test(rotas), false);
  return 'O componente usa useOrders legado e gera /pedidos/novo-pedido/editar; nenhuma rota com esse prefixo foi encontrada em src/routes/config.';
});

const relatorio = { escopo: 'Simulação local com código real transpilado e dependências controladas; não equivale a E2E, SQL remoto ou exploração em produção.', cenarios: resultados.length, resultados };
process.stdout.write(`${JSON.stringify(relatorio, null, 2)}\n`);
