import { render, screen } from "@testing-library/react";
import { TelemetryCharts } from "./TelemetryCharts";
import { expect, test, vi } from "vitest";

// Mock the dependencies
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockRows = [
  {
    id: "1",
    duration_ms: 500,
    severity: "slow",
    table_name: "products",
    rpc_name: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    duration_ms: 2000,
    severity: "very_slow",
    table_name: null,
    rpc_name: "get_user_profile",
    created_at: new Date().toISOString(),
  },
];

test("renders TelemetryCharts component correctly", () => {
  render(<TelemetryCharts rows={mockRows} timeFilter="1h" />);
  
  // Check for card titles
  expect(screen.getByText(/Alertas ao Longo do Tempo/i)).toBeDefined();
  expect(screen.getByText(/Latência \(ms\)/i)).toBeDefined();
  expect(screen.getByText(/Opções de Visualização/i)).toBeDefined();
  
  // Check for checkboxes
  expect(screen.getByLabelText(/Lentas/i)).toBeDefined();
  expect(screen.getByLabelText(/Muito Lentas/i)).toBeDefined();
  expect(screen.getByLabelText(/Erros/i)).toBeDefined();
  expect(screen.getByLabelText(/Duração Média/i)).toBeDefined();
  expect(screen.getByLabelText(/Duração Máxima/i)).toBeDefined();
  
  // Check for charts (mocked)
  expect(screen.getAllByTestId("responsive-container")).toHaveLength(3);
  expect(screen.getAllByTestId("area-chart")).toHaveLength(2);
  expect(screen.getByTestId("bar-chart")).toBeDefined();
});

test("returns null when rows are empty", () => {
  const { container } = render(<TelemetryCharts rows={[]} timeFilter="1h" />);
  expect(container.firstChild).toBeNull();
});
