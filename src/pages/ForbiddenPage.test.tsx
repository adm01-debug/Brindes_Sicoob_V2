import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ForbiddenPage from "./ForbiddenPage";
import { MemoryRouter } from "react-router-dom";


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
    fireEvent.click(backButton);

    
    expect(backSpy).toHaveBeenCalled();
  });
});
