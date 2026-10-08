import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAriaLive } from "./AriaLive";

export const RouteAnnouncer = () => {
  const location = useLocation();
  const { announce } = useAriaLive();

  useEffect(() => {
    // Small delay to ensure the page title has updated if set by PageSEO
    const timeout = setTimeout(() => {
      const pageTitle = document.title;
      if (pageTitle) {
        announce(`Navegou para a página: ${pageTitle}`);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [location.pathname, announce]);

  return null;
};
