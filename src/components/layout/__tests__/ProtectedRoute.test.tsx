import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProtectedRoute } from "../ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock useAuth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const MockComponent = () => <div data-testid="protected-content">Protected Content</div>;
const LoginPage = () => <div data-testid="login-page">Login Page</div>;
const ForbiddenPage = () => <div data-testid="forbidden-page">Forbidden Page</div>;

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loader when isLoading is true", () => {
    (useAuth as any).mockReturnValue({
      isLoading: true,
      user: null,
      profile: null,
    });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<MockComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("progressbar", { hidden: true })).toBeDefined();
  });

  it("redirects to /login when no user session", () => {
    (useAuth as any).mockReturnValue({
      isLoading: false,
      user: null,
      profile: null,
    });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<MockComponent />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("login-page")).toBeDefined();
  });

  it("redirects to /403 when role is incorrect for 'vendedor' requirement", () => {
    (useAuth as any).mockReturnValue({
      isLoading: false,
      user: { id: "123" },
      profile: { role: "agente" },
      isDev: false,
      isSupervisorOrAbove: false,
    });

    render(
      <MemoryRouter initialEntries={["/vendas"]}>
        <Routes>
          <Route element={<ProtectedRoute requiredRole="vendedor" />}>
            <Route path="/vendas" element={<MockComponent />} />
          </Route>
          <Route path="/403" element={<ForbiddenPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("forbidden-page")).toBeDefined();
  });

  it("renders content when role is correct", () => {
    (useAuth as any).mockReturnValue({
      isLoading: false,
      user: { id: "123" },
      profile: { role: "vendedor" },
      isDev: false,
      isSupervisorOrAbove: false,
    });

    render(
      <MemoryRouter initialEntries={["/vendas"]}>
        <Routes>
          <Route element={<ProtectedRoute requiredRole="vendedor" />}>
            <Route path="/vendas" element={<MockComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("protected-content")).toBeDefined();
  });
});
