import { render, screen, fireEvent } from "@testing-library/react";
import AdminVerbasPage from "../AdminVerbasPage";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AdminVerbasPage />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("AdminVerbasPage - JSX Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing and show main elements", () => {
    renderPage();
    expect(screen.getByText(/Gestão de Verbas/i)).toBeDefined();
    expect(screen.getByText(/Total Planejado/i)).toBeDefined();
  });

  it("should allow navigating to audit tab", async () => {
    renderPage();
    
    // Encontrar o trigger da aba de auditoria (Histórico)
    const auditTab = screen.getByRole("tab", { name: /Histórico/i });
    fireEvent.click(auditTab);

    // Verificar se o conteúdo da aba de auditoria aparece
    expect(screen.getByText(/Histórico de Orçamentos/i)).toBeDefined();
    expect(screen.getByText(/Últimas 50 ações/i)).toBeDefined();
  });
});
