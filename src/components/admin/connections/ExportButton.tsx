/**
 * ExportButton — Onda 13 #8
 * Botão reusável para exportar dados em CSV ou JSON.
 * Usa `trends-export` para CSV (já existe no projeto, sem deps extras)
 * e Blob nativo para JSON pretty-printed.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportTrendsCsv } from "@/lib/trends-export";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  filename: string;
  rows: Array<Record<string, unknown>>;
  columns?: Array<{ key: string; header: string }>;
  formats?: Array<"csv" | "json">;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
  disabled?: boolean;
  label?: string;
}

function downloadJson(filename: string, rows: unknown[]): void {
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportIcon({ busy }: { busy: boolean }) {
  return busy
    ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
    : <Download className="h-3 w-3 mr-1" />;
}

function isExportDisabled(disabled: boolean | undefined, busy: boolean, isEmpty: boolean): boolean {
  return Boolean(disabled) || busy || isEmpty;
}

function ExportMenuItems({ formats, onExport }: { formats: Array<"csv" | "json">; onExport: (format: "csv" | "json") => void }) {
  return (
    <>
      {formats.includes("csv") && <DropdownMenuItem onClick={() => onExport("csv")}>Baixar CSV</DropdownMenuItem>}
      {formats.includes("json") && <DropdownMenuItem onClick={() => onExport("json")}>Baixar JSON</DropdownMenuItem>}
    </>
  );
}

function useExporter(filename: string, rows: Array<Record<string, unknown>>, columns: Props["columns"]) {
  const [busy, setBusy] = useState(false);
  const handle = async (format: "csv" | "json") => {
    if (rows.length === 0) { toast.info("Nada para exportar"); return; }
    setBusy(true);
    try {
      if (format === "csv") exportTrendsCsv(filename, rows, columns);
      else downloadJson(filename, rows);
      toast.success(`Exportado (${format.toUpperCase()})`, { description: `${rows.length} registro${rows.length === 1 ? "" : "s"}` });
    } catch (error) {
      toast.error("Falha ao exportar", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };
  return { busy, handle };
}

export function ExportButton({
  filename,
  rows,
  columns,
  formats = ["csv", "json"],
  size = "sm",
  variant = "outline",
  disabled,
  label = "Exportar",
}: Props) {
  const isEmpty = rows.length === 0;
  const { busy, handle } = useExporter(filename, rows, columns);
  const buttonDisabled = isExportDisabled(disabled, busy, isEmpty);

  if (formats.length === 1) {
    const fmt = formats[0];
    if (!fmt) return null;
    return (
      (<Button
        size={size}
        variant={variant}
        disabled={buttonDisabled}
        onClick={() => handle(fmt)}
        className="h-8 text-xs"
      >
        <ExportIcon busy={busy} />
        {label} {fmt.toUpperCase()}
      </Button>)
    );
  }

  return (
    (<DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={buttonDisabled} className="h-8 text-xs">
          <ExportIcon busy={busy} />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs">
        <ExportMenuItems formats={formats} onExport={handle} />
      </DropdownMenuContent>
    </DropdownMenu>)
  );
}
