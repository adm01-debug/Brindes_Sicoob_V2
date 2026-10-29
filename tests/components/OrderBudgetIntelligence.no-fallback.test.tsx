import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderBudgetIntelligence } from "@/components/sicoob/orders/OrderBudgetIntelligence";

describe("OrderBudgetIntelligence sem verba configurada", () => {
  it("não mostra percentual ou viabilidade financeira quando a verba é zero", () => {
    render(
      <OrderBudgetIntelligence
        orderTotal={500}
        remainingBudget={0}
        allocatedBudget={0}
        paName="PA Teste"
      />,
    );

    expect(screen.getByText("Verba indisponível")).toBeInTheDocument();
    expect(screen.getByText("Não configurada")).toBeInTheDocument();
    expect(screen.getByText("Indisponível")).toBeInTheDocument();
    expect(screen.getByText("Análise indisponível")).toBeInTheDocument();
    expect(screen.getByText(/não pode ser calculado sem verba mensal/i)).toBeInTheDocument();
    expect(screen.queryByText("Análise em Tempo Real")).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it("identifica o consumo excedente usando a verba informada", () => {
    render(
      <OrderBudgetIntelligence
        orderTotal={300}
        remainingBudget={200}
        allocatedBudget={1_000}
        paName="PA Teste"
      />,
    );

    expect(screen.getByText("Consumo acima do saldo")).toBeInTheDocument();
    expect(screen.getByText("Alerta de Limite Excedido")).toBeInTheDocument();
    expect(screen.getByText(/Este pedido representa/)).toBeInTheDocument();
  });
});
