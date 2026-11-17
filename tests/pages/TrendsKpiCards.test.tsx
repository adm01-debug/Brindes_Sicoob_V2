import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendsKpiCards } from "../../src/pages/trends/TrendsKpiCards";

const data = { totalViews: 0, totalSearches: 0, uniqueProducts: 0, uniqueSearches: 0 };

describe("estado dos indicadores de tendências", () => {
  it("não apresenta atividade zero durante carregamento nem em uma falha inicial", () => {
    const view = render(<TrendsKpiCards current={data} previous={data} isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando indicadores");
    expect(screen.queryByText("Visualizações")).not.toBeInTheDocument();
    view.rerender(<TrendsKpiCards current={data} previous={data} isError />);
    expect(screen.queryByText("Visualizações")).not.toBeInTheDocument();
    view.rerender(<TrendsKpiCards current={data} previous={data} />);
    expect(screen.getByText("Visualizações")).toBeInTheDocument();
  });

  it("preserva o snapshot em cache quando a atualização falha", () => {
    render(
      <TrendsKpiCards
        current={{ ...data, totalViews: 12 }}
        previous={data}
        isError
        hasData
      />,
    );

    expect(screen.getByText("Visualizações")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
