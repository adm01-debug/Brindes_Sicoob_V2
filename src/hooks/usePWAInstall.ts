import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * `beforeinstallprompt` dispara **uma vez**, cedo, e o navegador não repete.
 * Guardar o evento no estado de cada instância do hook fazia com que só o
 * componente montado naquele instante (o cabeçalho) soubesse instalar: quem
 * abrisse /instalar depois montava outra instância, sem o evento, e via apenas
 * as instruções manuais — um botão "Instalar App" que não instala.
 *
 * O evento passa a viver em módulo, capturado por um ouvinte único registrado
 * na importação; as instâncias do hook apenas se inscrevem no que já foi
 * capturado.
 */
let promptCapturado: BeforeInstallPromptEvent | null = null;
const inscritos = new Set<(evento: BeforeInstallPromptEvent | null) => void>();

function publicar(evento: BeforeInstallPromptEvent | null) {
  promptCapturado = evento;
  for (const inscrito of inscritos) inscrito(evento);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    publicar(e as BeforeInstallPromptEvent);
  });
  // Instalado por fora (barra do navegador, outra aba): o convite morre.
  window.addEventListener("appinstalled", () => publicar(null));
}

function jaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(promptCapturado);
  const [isInstalled, setIsInstalled] = useState(jaInstalado);

  useEffect(() => {
    // Entre o primeiro render e este efeito o evento pode ter chegado.
    setInstallPrompt(promptCapturado);
    setIsInstalled(jaInstalado());
    inscritos.add(setInstallPrompt);
    return () => { inscritos.delete(setInstallPrompt); };
  }, []);

  const install = async () => {
    if (!installPrompt) return false;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      publicar(null);
      return true;
    }
    return false;
  };

  return { isInstallable: installPrompt !== null, isInstalled, install };
}
