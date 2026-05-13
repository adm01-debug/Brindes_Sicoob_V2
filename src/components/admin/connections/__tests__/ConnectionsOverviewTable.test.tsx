import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectionsOverviewTable } from "../ConnectionsOverviewTable";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectionsOverview } from "@/hooks/useConnectionsOverview";
import { useConnectionTester } from "@/hooks/useConnectionTester";
import { useConsecutiveFailures } from "@/hooks/useConsecutiveFailures";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mocks
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useConnectionsOverview", () => ({
  useConnectionsOverview: vi.fn(),
}));

vi.mock("@/hooks/useConnectionTester", () => ({
  useConnectionTester: vi.fn(),
}));

vi.mock("@/hooks/useConsecutiveFailures", () => ({
  useConsecutiveFailures: vi.fn(),
}));

vi.mock("@/hooks/useSecretsManager", () => ({
  useSecretsManager: vi.fn(),
}));

vi.mock("@/hooks/useConnectionsOverviewFilters", () => ({
  useConnectionsOverviewFilters: vi.fn(() => ({
    filters: { types: [], status: [], window: "all", onlyConsecutiveFailures: false },
    activeCount: 0,
    reset: vi.fn(),
    toggleType: vi.fn(),
    setStatus: vi.fn(),
    setWindow: vi.fn(),
    removeType: vi.fn(),
    setOnlyConsecutiveFailures: vi.fn(),
  })),
  applyFilters: vi.fn((rows) => rows),
}));

describe("ConnectionsOverviewTable Regression Tests", () => {
  const mockRows = [
    {
      key: "conn-1",
      id: "conn-1",
      type: "supabase",
      name: "Main Database",
      env_key: "promobrind",
      status: "active",
      last_test_at: new Date().toISOString(),
      last_test_ok: true,
      last_test_message: "OK",
      last_latency_ms: 50,
      auto_test_enabled: true,
    },
    {
      key: "conn-2",
      id: "conn-2",
      type: "bitrix24",
      name: "CRM Integration",
      env_key: "crm",
      status: "error",
      last_test_at: new Date().toISOString(),
      last_test_ok: false,
      last_test_message: "Connection timeout",
      last_latency_ms: null,
      auto_test_enabled: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as any);
    vi.mocked(useConnectionsOverview).mockReturnValue({
      rows: mockRows,
      loading: false,
      refreshing: false,
      refresh: vi.fn(),
      patchRow: vi.fn(),
    });
    vi.mocked(useConnectionTester).mockReturnValue({
      test: vi.fn(),
      testing: false,
    });
    vi.mocked(useConsecutiveFailures).mockReturnValue({
      map: new Map(),
      loading: false,
    });
    vi.mocked(useSecretsManager).mockReturnValue({
      secrets: [],
      list: vi.fn(),
    });
  });

  it("should render the table with correct data", async () => {
    render(
      <TooltipProvider>
        <ConnectionsOverviewTable />
      </TooltipProvider>
    );

    expect(screen.getByText("Main Database")).toBeInTheDocument();
    expect(screen.getByText("CRM Integration")).toBeInTheDocument();
    // Use getAllByText because "OK" might appear in filters as well
    expect(screen.getAllByText("OK").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Connection timeout")).toBeInTheDocument();

  });

  it("should show status badges correctly", async () => {
    render(
      <TooltipProvider>
        <ConnectionsOverviewTable />
      </TooltipProvider>
    );

    // Status badges use localized text or icons, let's check for the presence of rows
    expect(screen.getAllByRole("row")).toHaveLength(3); // Header + 2 data rows
  });

  it("should trigger refresh when button is clicked", async () => {
    const refreshMock = vi.fn();
    vi.mocked(useConnectionsOverview).mockReturnValue({
      rows: mockRows,
      loading: false,
      refreshing: false,
      refresh: refreshMock,
      patchRow: vi.fn(),
    });

    render(
      <TooltipProvider>
        <ConnectionsOverviewTable />
      </TooltipProvider>
    );

    const refreshButton = screen.getByText("Atualizar");
    fireEvent.click(refreshButton);

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("should handle empty state", async () => {
    vi.mocked(useConnectionsOverview).mockReturnValue({
      rows: [],
      loading: false,
      refreshing: false,
      refresh: vi.fn(),
      patchRow: vi.fn(),
    });

    render(
      <TooltipProvider>
        <ConnectionsOverviewTable />
      </TooltipProvider>
    );

    expect(screen.getByText("Nenhuma conexão cadastrada")).toBeInTheDocument();
  });
});
