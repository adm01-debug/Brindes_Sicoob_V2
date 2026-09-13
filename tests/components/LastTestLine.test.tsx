import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LastTestLine } from "@/components/admin/connections/LastTestLine";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  makeTimeoutResult,
  makeNetworkResult,
  makeAuthResult,
  makeHttpResult,
  makeOkResult,
  toLastTestInfo,
} from "../_helpers/connection-fixtures";

const renderLastTestLine = (info: React.ComponentProps<typeof LastTestLine>["info"]) =>
  render(<TooltipProvider><LastTestLine info={info} /></TooltipProvider>);

describe("LastTestLine", () => {
  it("Sucesso: mostra 'Verificado' e não exibe hint de erro", () => {
    renderLastTestLine(toLastTestInfo(makeOkResult()));
    expect(screen.getByText(/Verificado/)).toBeInTheDocument();
    expect(screen.queryByText(/Tempo esgotado/)).not.toBeInTheDocument();
  });

  it("Nunca verificado quando info é null", () => {
    renderLastTestLine(null);
    expect(screen.getByText(/Nunca verificado/)).toBeInTheDocument();
  });

  it("Timeout com timeout_ms exibe título, hint com '12000ms' e linha técnica", () => {
    renderLastTestLine(toLastTestInfo(makeTimeoutResult()));
    expect(screen.getByText(/Tempo esgotado/)).toBeInTheDocument();
    expect(screen.getAllByText(/12000ms/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/timeout 12000ms/)).toBeInTheDocument();
  });

  it("Network legacy (sem error_kind): infere e mostra 'Sem conexão'", () => {
    const info = toLastTestInfo(makeNetworkResult());
    info.error_kind = null;
    renderLastTestLine(info);
    expect(screen.getByText(/Sem conexão com o serviço/)).toBeInTheDocument();
  });

  it("Auth 401 legacy (sem error_kind): infere e mostra 'Credenciais rejeitadas'", () => {
    const info = toLastTestInfo(makeAuthResult());
    info.error_kind = null;
    renderLastTestLine(info);
    expect(screen.getByText(/Credenciais rejeitadas/)).toBeInTheDocument();
  });

  it("HTTP 504: title contém '504'", () => {
    renderLastTestLine(toLastTestInfo(makeHttpResult(504)));
    expect(screen.getByText(/Erro HTTP 504/)).toBeInTheDocument();
  });

  it("Tooltip: header tem title com detalhe técnico (HTTP + message)", () => {
    const { container } = renderLastTestLine(toLastTestInfo(makeHttpResult(504)));
    const titled = container.querySelector("span[title]");
    expect(titled).not.toBeNull();
    expect(titled!.getAttribute("title")).toContain("504");
  });
});
