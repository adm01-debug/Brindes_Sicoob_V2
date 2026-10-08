import { useState, useEffect } from "react";
import { useExternalDbInspect } from "@/hooks/useExternalDbInspect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, RefreshCw, ChevronRight, ArrowLeft, FileSearch, Copy, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSEO } from "@/components/seo/PageSEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ENGRAVING_TABLES,
  diffColumns,
  buildMarkdownReport,
  type ExpectedTable,
  type TableDiff,
} from "./engraving-schema-diff";
import {
  getContractMismatches,
  getRecentMismatches,
  type ContractMismatchEntry,
} from "@/lib/personalization/adapters";
import { ALL_CONTRACTS } from "@/lib/personalization/rpc-contracts";
import { validateRpcPayload, type ValidationResult } from "@/lib/personalization/rpc-validator";
import { invokeExternalRpc } from "@/lib/external-rpc";

async function inspectEngravingTable(table: ExpectedTable): Promise<TableDiff> {
  const { data, error } = await supabase.functions.invoke("external-db-inspect", {
    body: { mode: "columns", tableName: table.table },
  });
  if (error || !data?.success) {
    return {
      table: table.table,
      exists: false,
      error: error?.message ?? data?.error ?? "Tabela não acessível",
      expectedColumns: table.expectedColumns,
      actualColumns: [],
      missingInDb: [],
      newInDb: [],
      consumers: table.consumers,
    };
  }
  const actual: string[] = data.columns ?? [];
  const { missingInDb, newInDb } = diffColumns(table.expectedColumns, actual);
  return {
    table: table.table,
    exists: true,
    expectedColumns: table.expectedColumns,
    actualColumns: actual,
    missingInDb,
    newInDb,
    consumers: table.consumers,
  };
}

async function collectEngravingDiffs(): Promise<TableDiff[]> {
  const results: TableDiff[] = [];
  for (const table of ENGRAVING_TABLES) results.push(await inspectEngravingTable(table));
  return results;
}

export default function AdminExternalDbPage() {
  const { result, isLoading, listTables, describeTable } = useExternalDbInspect();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<TableDiff[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [contractCounts, setContractCounts] = useState<Record<string, number>>({});
  const [recentMismatches, setRecentMismatches] = useState<ContractMismatchEntry[]>([]);
  const [liveResults, setLiveResults] = useState<Record<string, ValidationResult>>({});
  const [liveLoading, setLiveLoading] = useState<string | null>(null);

  const refreshTelemetry = () => {
    setContractCounts(getContractMismatches() as Record<string, number>);
    setRecentMismatches([...getRecentMismatches()]);
  };

  const testContract = async (contractName: string) => {
    setLiveLoading(contractName);
    try {
      const contract = ALL_CONTRACTS.find((c) => c.name === contractName);
      if (!contract) return;
      // Payloads de teste mínimos — front aceita "samples".
      // O usuário pode ajustar via UI futura; por ora validamos o último payload conhecido.
      // Aqui só rodamos uma chamada vazia para registrar erro/sucesso.
      const params: Record<string, unknown> =
        contractName === "fn_get_customization_price"
          ? { p_area_id: "00000000-0000-0000-0000-000000000000", p_quantidade: 100, p_num_cores: 1 }
          : { p_product_id: "00000000-0000-0000-0000-000000000000" };
      const result = await invokeExternalRpc<Record<string, unknown>>(contractName, params);
      const validation = validateRpcPayload(contract, result ?? {});
      setLiveResults((prev) => ({ ...prev, [contractName]: validation }));
      toast.success(`${contractName}`, {
        description: validation.ok ? "Contrato OK" : `${validation.missing.length} campos ausentes`,
      });
      refreshTelemetry();
    } catch (err) {
      toast.error("Falha ao testar RPC", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setLiveLoading(null);
    }
  };


  const runEngravingDiff = async () => {
    setDiffLoading(true);
    setDiffs(null);
    try {
      const results = await collectEngravingDiffs();
      setDiffs(results);
      toast.success("Diff gerado", { description: `${results.length} tabelas inspecionadas` });
    } catch (err) {
      toast.error("Falha ao gerar diff", {
        description: err instanceof Error ? err.message : "Erro desconhecido",
      });
    } finally {
      setDiffLoading(false);
    }
  };

  const copyReport = async () => {
    if (!diffs) return;
    await navigator.clipboard.writeText(buildMarkdownReport(diffs));
    toast.success("Relatório copiado para a área de transferência");
  };

  useEffect(() => {
    listTables();
    refreshTelemetry();
    const id = setInterval(refreshTelemetry, 4000);
    return () => clearInterval(id);
  }, []);

  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    await describeTable(tableName);
  };

  const handleBack = () => {
    setSelectedTable(null);
    listTables();
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
      <PageSEO title="Banco de Dados Externo" description="Configure conexões com bancos de dados externos." path="/admin/external-db" noIndex />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6" />
            Inspeção do Banco Externo
          </h1>
          <p className="text-muted-foreground">Visualize a estrutura das tabelas do banco de dados externo (somente leitura)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => selectedTable ? handleSelectTable(selectedTable) : listTables()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-5 w-5" /> Diff de Gravação / Técnicas / Tamanhos
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Compara os tipos do front com o schema atual das 4 tabelas críticas:
              <code className="ml-1">tabela_preco_gravacao_oficial</code>,{" "}
              <code>tabela_preco_gravacao_oficial_faixa</code>,{" "}
              <code>print_area_techniques</code>, <code>tecnica_gravacao</code>.
            </p>
          </div>
          <div className="flex gap-2">
            {diffs && (
              <Button variant="outline" size="sm" onClick={copyReport}>
                <Copy className="h-4 w-4 mr-2" /> Copiar relatório
              </Button>
            )}
            <Button size="sm" onClick={runEngravingDiff} disabled={diffLoading}>
              <FileSearch className="h-4 w-4 mr-2" />
              {diffLoading ? "Inspecionando..." : "Comparar agora"}
            </Button>
          </div>
        </CardHeader>
        {diffs && (
          <CardContent className="space-y-4">
            {diffs.map((d) => (
              <div key={d.table} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {d.exists ? (
                      d.missingInDb.length === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <code className="text-sm font-semibold">{d.table}</code>
                  </div>
                  {d.exists && (
                    <div className="flex gap-1 text-xs">
                      <Badge variant="outline">{d.actualColumns.length} colunas no banco</Badge>
                      <Badge variant="outline">{d.expectedColumns.length} esperadas</Badge>
                    </div>
                  )}
                </div>
                {!d.exists && (
                  <p className="text-xs text-destructive">⚠ {d.error}</p>
                )}
                {d.exists && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-destructive mb-1">
                        🔴 Faltando no banco ({d.missingInDb.length})
                      </p>
                      {d.missingInDb.length === 0 ? (
                        <p className="text-muted-foreground italic">nenhuma — front OK</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {d.missingInDb.map((c) => (
                            <li key={c}>
                              <code className="bg-destructive/10 px-1 rounded">{c}</code>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-success mb-1">
                        🟢 Novas no banco ({d.newInDb.length})
                      </p>
                      {d.newInDb.length === 0 ? (
                        <p className="text-muted-foreground italic">nenhuma</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {d.newInDb.map((c) => (
                            <li key={c}>
                              <code className="bg-success/10 px-1 rounded">{c}</code>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Consumidores no front ({d.consumers.length})
                  </summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {d.consumers.map((c) => (
                      <li key={c}><code>{c}</code></li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5" /> Validação RPC (Personalização)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Compara payloads de <code>fn_get_customization_price</code> e{" "}
            <code>fn_get_product_customization_options</code> contra o contrato esperado pelo
            front. Mismatches são contados em{" "}
            <code>window.__personalizationSchemaStats.contractMismatches</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_CONTRACTS.map((contract) => (
            <ContractValidationRow
              key={contract.name}
              contract={contract}
              count={contractCounts[contract.name] ?? 0}
              live={liveResults[contract.name]}
              loading={liveLoading === contract.name}
              onTest={testContract}
            />
          ))}
          {recentMismatches.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Últimos {recentMismatches.length} desvios observados
              </summary>
              <ul className="mt-2 space-y-1">
                {recentMismatches.slice().reverse().map((m, i) => (
                  <li key={i} className="border-l-2 border-destructive/50 pl-2">
                    <code className="text-xs">{m.contract}</code>{" "}
                    <span className="text-muted-foreground">
                      ({new Date(m.at).toLocaleTimeString()})
                    </span>
                    {m.missing.length > 0 && (
                      <div>missing: {m.missing.join(", ")}</div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      <DatabaseExplorer selectedTable={selectedTable} result={result} loading={isLoading}
        onBack={handleBack} onSelect={handleSelectTable} />
    </div>
  );
}

type InspectResult = ReturnType<typeof useExternalDbInspect>["result"];

interface DatabaseExplorerProps {
  selectedTable: string | null;
  result: InspectResult;
  loading: boolean;
  onBack: () => void;
  onSelect: (tableName: string) => Promise<void>;
}

function TableColumns({ result, loading }: Pick<DatabaseExplorerProps, "result" | "loading">) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}</div>;
  if (!result?.table?.columns) return <p className="text-muted-foreground text-center py-8">Nenhuma informação disponível</p>;
  return (
    <Table><TableHeader><TableRow><TableHead>Coluna</TableHead><TableHead>Tipo</TableHead><TableHead>Nullable</TableHead></TableRow></TableHeader>
      <TableBody>{result.table.columns.map((column, index) => (
        <TableRow key={index}><TableCell className="font-mono text-sm">{column.name}</TableCell>
          <TableCell><Badge variant="outline">{column.type}</Badge></TableCell>
          <TableCell><Badge variant={column.nullable ? "secondary" : "default"}>{column.nullable ? "Sim" : "Não"}</Badge></TableCell>
        </TableRow>
      ))}</TableBody>
    </Table>
  );
}

function TableList({ result, loading, onSelect }: Pick<DatabaseExplorerProps, "result" | "loading" | "onSelect">) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>;
  if (!result?.tables?.length) return <p className="text-muted-foreground text-center py-8">Nenhuma tabela encontrada</p>;
  return <div className="divide-y">{result.tables.map((table) => (
    <div key={table.name} className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded cursor-pointer transition-colors"
      onClick={() => onSelect(table.name)}>
      <div className="flex items-center gap-3"><Database className="h-4 w-4 text-primary" /><span className="font-mono text-sm">{table.name}</span>
        {table.schema && <Badge variant="outline" className="text-xs">{table.schema}</Badge>}
      </div>
      <div className="flex items-center gap-2">
        {table.rowCount !== undefined && <span className="text-xs text-muted-foreground">{table.rowCount} rows</span>}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  ))}</div>;
}

function DatabaseExplorer({ selectedTable, result, loading, onBack, onSelect }: DatabaseExplorerProps) {
  if (!selectedTable) {
    return <Card><CardHeader><CardTitle className="text-lg">Tabelas Disponíveis</CardTitle></CardHeader>
      <CardContent><TableList result={result} loading={loading} onSelect={onSelect} /></CardContent></Card>;
  }
  return (
    <>
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar para lista</Button>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />{selectedTable}</CardTitle></CardHeader>
        <CardContent><TableColumns result={result} loading={loading} /></CardContent></Card>
    </>
  );
}

type RpcContract = (typeof ALL_CONTRACTS)[number];

interface ContractValidationRowProps {
  contract: RpcContract;
  count: number;
  live: ValidationResult | undefined;
  loading: boolean;
  onTest: (contractName: string) => Promise<void>;
}

function ContractLiveResult({ result }: { result: ValidationResult }) {
  return (
    <div className="text-xs space-y-1 pt-1 border-t">
      <p><strong>Resultado:</strong>{" "}
        <Badge variant={result.ok ? "default" : "destructive"} className="text-xs">{result.ok ? "OK" : "Mismatch"}</Badge>
      </p>
      {result.missing.length > 0 && <p><strong className="text-destructive">Missing:</strong>{" "}
        {result.missing.map((field) => <code key={field} className="bg-destructive/10 px-1 rounded mr-1">{field}</code>)}
      </p>}
      {result.extras.length > 0 && <p><strong className="text-success">Extras:</strong>{" "}
        {result.extras.map((field) => <code key={field} className="bg-success/10 px-1 rounded mr-1">{field}</code>)}
      </p>}
      {Object.keys(result.resolvedAliases).length > 0 && <p><strong>Aliases resolvidos:</strong>{" "}
        <code>{JSON.stringify(result.resolvedAliases)}</code>
      </p>}
    </div>
  );
}

function ContractValidationRow({ contract, count, live, loading, onTest }: ContractValidationRowProps) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {count === 0 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
          <code className="text-sm font-semibold">{contract.name}</code>
          <Badge variant={count === 0 ? "outline" : "destructive"}>{count} mismatch{count === 1 ? "" : "es"}</Badge>
          <Badge variant="outline" className="text-xs">{contract.requiredFields.length} required</Badge>
        </div>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => onTest(contract.name)}>
          {loading ? "Testando..." : "Testar agora"}
        </Button>
      </div>
      {live && <ContractLiveResult result={live} />}
    </div>
  );
}
