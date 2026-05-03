import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ForbiddenPage from "../ForbiddenPage";
import { MemoryRouter } from "react-router-dom";
import React from "react";

describe("ForbiddenPage", () => {
  it("renders access denied message and path", () => {
    render(
      <MemoryRouter initialEntries={["/restricted-path"]}>
        <ForbiddenPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Acesso Negado/i)).toBeDefined();
    expect(screen.getByText(/\/restricted-path/i)).toBeDefined();
  });

  it("has a link to return home", () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole("link", { name: /Ir para o início/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("has a back button", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: /Voltar/i });
    backButton.click();
    
    expect(backSpy).toHaveBeenCalled();
  });
});
