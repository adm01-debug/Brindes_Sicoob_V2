import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuoteApprovalCard } from "@/components/quotes/QuoteApprovalCard";

describe("QuoteApprovalCard", () => {
  it("apresenta a composição comercial antes da decisão", () => {
    render(<QuoteApprovalCard
      quoteNumber="ORC-001"
      clientName="Cooperativa Teste"
      total={1250}
      validUntil="2026-09-30T12:00:00Z"
      status="active"
      paymentTerms="28 dias"
      deliveryTime="15 dias úteis"
      shippingCost={50}
      notes="Entrega no PA central"
      items={[{
        id: "item-1", product_name: "Caneca térmica", product_sku: "CAN-001",
        color_name: "Verde", quantity: 10, unit_price: 120, subtotal: 1200,
        personalizations: [{ colors_count: 1, positions_count: 1, notes: "Logo Sicoob frontal" }],
      }]}
      onApprove={vi.fn()}
      onReject={vi.fn()}
    />);

    expect(screen.getByText("Caneca térmica")).toBeInTheDocument();
    expect(screen.getByText(/Logo Sicoob frontal/)).toBeInTheDocument();
    expect(screen.getByText(/Pagamento:/)).toBeInTheDocument();
    expect(screen.getByText(/Prazo:/)).toBeInTheDocument();
    expect(screen.getByText(/Frete:/)).toBeInTheDocument();
    expect(screen.getByText(/Entrega no PA central/)).toBeInTheDocument();
  });

  it("oculta ações depois de uma decisão", () => {
    render(<QuoteApprovalCard quoteNumber="ORC-002" total={100} status="approved" isResponded onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /aprovar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /recusar/i })).not.toBeInTheDocument();
  });
});
