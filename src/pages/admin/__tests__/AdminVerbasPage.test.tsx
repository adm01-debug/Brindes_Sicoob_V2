import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminVerbasPage from "../AdminVerbasPage";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

// Mock do contexto de autenticação e onboarding
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user" },
    profile: { id: "test-profile", role: "admin" },
    isAdmin: true,
    isSupervisorOrAbove: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useOnboarding", () => ({
  useOnboarding: () => ({
    startTour: vi.fn(),
    isActive: false,
  }),
}));

vi.mock("@/hooks/useDevGate", () => ({
  useDevGate: () => ({
    isDev: true,
    canAccess: () => true,
    flags: [],
  }),
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
    
    // Encontrar o trigger da aba de auditoria (Histórico de Alterações)
    const auditTab = screen.getByRole("tab", { name: /Histórico de Alterações/i });
    fireEvent.click(auditTab);

    // Verificar se o conteúdo da aba de auditoria aparece
    expect(screen.getByText(/Histórico de Orçamentos/i)).toBeDefined();
    expect(screen.getByText(/Últimas 50 ações/i)).toBeDefined();
  });
});
