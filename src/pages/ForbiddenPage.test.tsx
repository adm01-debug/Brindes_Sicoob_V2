import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ForbiddenPage from "./ForbiddenPage";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";



describe("ForbiddenPage", () => {
  it("renders access denied message and path", () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/restricted-path"]}>
          <ForbiddenPage />
        </MemoryRouter>
      </HelmetProvider>
    );


    expect(screen.getByText(/Acesso Negado/i)).toBeDefined();
    expect(screen.getByText(/\/restricted-path/i)).toBeDefined();
  });

  it("has a link to return home", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ForbiddenPage />
        </MemoryRouter>
      </HelmetProvider>
    );


    const homeLink = screen.getByRole("link", { name: /Ir para o início/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("has a back button", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ForbiddenPage />
        </MemoryRouter>
      </HelmetProvider>
    );


    const backButton = screen.getByRole("button", { name: /Voltar/i });
    fireEvent.click(backButton);

    
    expect(backSpy).toHaveBeenCalled();
  });
});
