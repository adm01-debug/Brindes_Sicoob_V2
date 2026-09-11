import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it } from "vitest";
import { PageSEO } from "@/components/seo/PageSEO";

describe("PageSEO", () => {
  afterEach(() => {
    document.head.querySelectorAll('[data-rh="true"]').forEach(node => node.remove());
  });

  it("publica metadados privados sem depender de um domínio provisório", async () => {
    render(
      <HelmetProvider>
        <PageSEO
          title="Catálogo"
          description="Escolha brindes para sua cooperativa."
          path="/produtos"
          noIndex
          ogImage="/brand/catalogo.png"
          jsonLd={{ "@type": "WebPage", name: "Catálogo" }}
        />
      </HelmetProvider>,
    );

    await waitFor(() => expect(document.title).toBe("Catálogo | Portal de Compras Sicoob"));
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute("content", "/brand/catalogo.png");
    expect(document.head.querySelector('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${window.location.origin}/produtos`);
    expect(document.head.querySelector('script[type="application/ld+json"]')?.textContent).toContain('"name":"Catálogo"');
  });

  it("omite URL e imagem quando não foram informadas", async () => {
    render(
      <HelmetProvider>
        <PageSEO title="Entrar" />
      </HelmetProvider>,
    );

    await waitFor(() => expect(document.title).toBe("Entrar | Portal de Compras Sicoob"));
    expect(document.head.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
    expect(document.head.querySelector('meta[property="og:image"]')).not.toBeInTheDocument();
    expect(document.head.querySelector('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");
  });
});
