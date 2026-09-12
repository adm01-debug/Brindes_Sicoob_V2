import React from "react";
import { Helmet } from "react-helmet-async";

interface PageSEOProps {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
}

const BASE_URL = typeof window === "undefined" ? "" : window.location.origin;
const SITE_NAME = "Portal de Compras Sicoob";
const DEFAULT_DESC = "Portal de brindes para cooperativas Sicoob. Catálogo centralizado de produtos, brindes e itens institucionais.";

interface OptionalSeoTagsProps {
  noIndex?: boolean;
  image?: string;
  url?: string;
  jsonLd?: Record<string, unknown>;
}

function OptionalSeoTags({ noIndex, image, url, jsonLd }: OptionalSeoTagsProps) {
  return (
    <Helmet>
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      {image && <meta name="twitter:image" content={image} />}
      {url && <link rel="canonical" href={url} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

export const PageSEO = React.forwardRef<HTMLElement, PageSEOProps>(function PageSEO({ title, description, path, noIndex, ogImage, ogType, jsonLd }, _ref) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const desc = description || DEFAULT_DESC;
  const url = path ? `${BASE_URL}${path}` : undefined;
  const image = ogImage;

  return (
    <>
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={desc} />

        {/* Open Graph */}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content={ogType || "website"} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="pt_BR" />

        {/* Twitter */}
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={desc} />
      </Helmet>
      <OptionalSeoTags noIndex={noIndex} image={image} url={url} jsonLd={jsonLd} />
    </>
  );
});
