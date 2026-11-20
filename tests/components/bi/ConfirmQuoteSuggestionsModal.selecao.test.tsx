import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../render-helpers";
import { ConfirmQuoteSuggestionsModal, type SuggestionItem } from "@/components/bi/ConfirmQuoteSuggestionsModal";

const baseSuggestions: SuggestionItem[] = [
  { name: "Caneca Vitória", priceFrom: 10, priceTo: 18, reason: "afinidade", productId: "p1", imageUrl: null, source: "affinity" },
  { name: "Mochila Sem Vínculo", priceFrom: 60, priceTo: 90, reason: "tendência", productId: null, imageUrl: null, source: "industry" },
];

describe("ConfirmQuoteSuggestionsModal — seleção por quoteSuggestionKey", () => {
  it("desmarcar remove a sugestão do conjunto usado no envio (bug Devin/Codex)", () => {
    renderWithProviders(
      <ConfirmQuoteSuggestionsModal
        open={true}
        onOpenChange={() => {}}
        clientId="c1"
        clientName="Cliente"
        suggestions={baseSuggestions}
      />
    );
    const [caneca, mochila] = screen.getAllByRole("checkbox") as unknown as [HTMLInputElement, HTMLInputElement];
    expect(caneca.getAttribute("aria-checked")).toBe("true");
    expect(mochila.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(mochila);
    expect(caneca.getAttribute("aria-checked")).toBe("true");
    expect(mochila.getAttribute("aria-checked")).toBe("false");
  });

  it("sugestões homônimas recebem chaves distintas e são independentes", () => {
    const suggestions: SuggestionItem[] = [
      { ...baseSuggestions[0]! },
      { ...baseSuggestions[0]!, productId: "p2" },
    ];
    renderWithProviders(
      <ConfirmQuoteSuggestionsModal
        open={true}
        onOpenChange={() => {}}
        clientId="c1"
        clientName="Cliente"
        suggestions={suggestions}
      />
    );
    const [primeira, segunda] = screen.getAllByRole("checkbox") as unknown as [HTMLInputElement, HTMLInputElement];
    expect(primeira.getAttribute("aria-checked")).toBe("true");
    expect(segunda.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(primeira);
    expect(primeira.getAttribute("aria-checked")).toBe("false");
    expect(segunda.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(segunda);
    expect(segunda.getAttribute("aria-checked")).toBe("false");
  });
});