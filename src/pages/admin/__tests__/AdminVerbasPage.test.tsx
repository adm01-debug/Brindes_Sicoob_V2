import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminVerbasPage from "../AdminVerbasPage";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

// Mock total do MainLayout para evitar dependências de contexto complexas
vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

// Mock do PageSEO
vi.mock("@/components/seo/PageSEO", () => ({
  PageSEO: () => null,
}));

// Mock do contexto de autenticação
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user" },
    profile: { id: "test-profile", role: "admin" },
    isAdmin: true,
    isSupervisorOrAbove: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      gcTime: 0,
      staleTime: 0,
    },
  },
});

const renderPage = () => {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            <AdminVerbasPage />
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
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
    
    // Encontrar o trigger da aba de auditoria usando o value 'audit'
    const auditTab = screen.getByRole("tab", { name: /Alterações|Histórico/i });
    fireEvent.click(auditTab);

    // Verificar se o conteúdo da aba de auditoria aparece
    await waitFor(() => {
      // Procurar pelo título do Card dentro da aba
      expect(screen.getByText(/Histórico de Orçamentos/i)).toBeDefined();
    });
  });
});
