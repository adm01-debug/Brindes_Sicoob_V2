/**
 * Aba "Por Produto" do simulador: produto do catalogo externo com preco de
 * venda invalido (zero/negativo/infinito/ausente) precisa avisar e bloquear o
 * avanco, senao a gravacao entra no orcamento com o item a R$ 0,00.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/lib/external-db", () => ({
  invokeExternalDb: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

const estado = vi.hoisted(() => ({ produto: null as unknown }));

vi.mock("@/components/pricing/simulator/ProductSearch", () => ({
  ProductSearch: ({ onSelect }: { onSelect: (produto: unknown) => void }) => (
    <button type="button" onClick={() => onSelect(estado.produto)}>Escolher produto de teste</button>
  ),
}));

function produto(salePrice: number, priceAvailable: boolean, comCor = false) {
  return {
    id: "produto-teste",
    name: "Caneca Personalizada",
    sku: "SKU-1",
    price: salePrice,
    priceAvailable,
    images: [],
    colors: comCor ? [{ code: "AZ", name: "Azul", hex: "#0000ff" }] : undefined,
  };
}

async function selecionar(valor: unknown) {
  estado.produto = valor;
  const mod = await import("@/components/pricing/ProductPriceSimulator");
  const Component = mod.default;
  renderWithProviders(<Component />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher produto de teste" }));
}

describe("ProductPriceSimulator — preço de venda inválido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("avisa e bloqueia personalização e orçamento quando o preço é inválido", async () => {
    await selecionar(produto(0, false));

    expect(await screen.findByText("Produto sem preço de venda no catálogo")).toBeTruthy();
    expect(screen.queryByText(/Personalizações/)).toBeNull();
    expect(screen.queryByText("Criar Orçamento a partir desta Simulação")).toBeNull();
  });

  it("bloqueia também a seleção de cor quando o produto tem variantes", async () => {
    await selecionar(produto(0, false, true));

    expect(await screen.findByText("Produto sem preço de venda no catálogo")).toBeTruthy();
    expect(screen.queryByText(/Selecione a Cor do Produto/)).toBeNull();
    expect(screen.queryByText("Criar Orçamento a partir desta Simulação")).toBeNull();
  });

  it("libera a seleção de cor com preço válido em produto com variantes", async () => {
    await selecionar(produto(12.5, true, true));

    expect(await screen.findByText(/Selecione a Cor do Produto/)).toBeTruthy();
    expect(screen.queryByText("Produto sem preço de venda no catálogo")).toBeNull();
  });

  it("mantém a simulação normal quando o preço é válido", async () => {
    await selecionar(produto(12.5, true));

    expect(screen.queryByText("Produto sem preço de venda no catálogo")).toBeNull();
    expect(await screen.findByText(/Personalizações/)).toBeTruthy();
  });
});
