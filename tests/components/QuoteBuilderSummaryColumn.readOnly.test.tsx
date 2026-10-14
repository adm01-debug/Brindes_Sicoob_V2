// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteBuilderSummaryColumn } from "@/components/quotes/QuoteBuilderSummaryColumn";
import type { QuoteItem } from "@/hooks/quotes/useQuotes";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isGerentePa: false }) }));

describe("QuoteBuilderSummaryColumn — somente leitura", () => {
  it("remove os controles mutáveis da navegação por teclado e bloqueia handlers", () => {
    const callbacks = {
      setActiveItemIndex: vi.fn(),
      removeItem: vi.fn(),
      setDiscountType: vi.fn(),
      setDiscountValue: vi.fn(),
      onSave: vi.fn(),
      setNegotiationMarkup: vi.fn(),
      confirmItemPrice: vi.fn(),
      confirmAllStalePrices: vi.fn(),
      onToggleSelection: vi.fn(),
      onGroupItems: vi.fn(),
      onUngroup: vi.fn(),
      onClearSelection: vi.fn(),
    };
    const item = {
      product_id: "produto-1",
      product_name: "Caneca Sicoob",
      product_sku: "CAN-1",
      quantity: 10,
      unit_price: 12,
      price_updated_at: "2020-01-01T00:00:00.000Z",
      price_freshness_threshold_days: 60,
      kit_group_id: "kit-1",
      kit_name: "Kit boas-vindas",
      personalizations: [],
    } as QuoteItem;

    render(<TooltipProvider><QuoteBuilderSummaryColumn
      readOnly
      items={[item]}
      activeItemIndex={null}
      discountType="percent"
      discountValue={5}
      discountAmount={6}
      total={114}
      isFormValid
      isDraftValid
      validationErrors={[]}
      quotesLoading={false}
      isEditMode
      formatCurrency={value => `R$ ${value}`}
      calculateItemPersonalizationTotal={() => 0}
      calculateItemTotal={() => 120}
      negotiationMarkup={10}
      realSubtotal={120}
      realDiscountPercent={5}
      selectedIndexes={new Set([0])}
      {...callbacks}
    /></TooltipProvider>);

    expect(screen.getAllByRole("button").every(button => (button as HTMLButtonElement).disabled)).toBe(true);
    expect((screen.getByRole("spinbutton") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("slider").getAttribute("data-disabled")).not.toBeNull();

    fireEvent.click(screen.getByText("Caneca Sicoob"));
    Object.values(callbacks).forEach(callback => expect(callback).not.toHaveBeenCalled());
  });
});
