import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAriaLive } from "./AriaLive";

export const RouteAnnouncer = () => {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Small delay to ensure the page title has updated if set by PageSEO
    const timeout = setTimeout(() => {
      const pageTitle = document.title;
      if (pageTitle) {
        setAnnouncement(`Navegou para a página: ${pageTitle}`);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return <AriaLive message={announcement} aria-live="polite" />;
};
