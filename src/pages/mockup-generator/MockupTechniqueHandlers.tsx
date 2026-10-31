import { useState, useCallback } from "react";
import { toast } from "sonner";
import { techniqueNeedsColorConfig, classifyTechnique, type TechniqueColorConfig } from "@/components/mockup/techniqueColorUtils";
import type { Technique } from "@/hooks/mockup/mockupGenerationService";

interface TechniqueHandlersOptions {
  hasLogo: boolean;
  selectedTechnique: Technique | null;
  setSelectedTechnique: (technique: Technique | null) => void;
  setGeneratedMockup: (mockup: string | null) => void;
  setTechniqueColorConfig: (config: TechniqueColorConfig | null) => void;
}

export function useTechniqueHandlers({
  hasLogo,
  selectedTechnique,
  setSelectedTechnique,
  setGeneratedMockup,
  setTechniqueColorConfig,
}: TechniqueHandlersOptions) {
  const [pendingTechnique, setPendingTechnique] = useState<Technique | null>(null);
  const [techniqueChangeDialogOpen, setTechniqueChangeDialogOpen] = useState(false);
  const [colorConfigDialogOpen, setColorConfigDialogOpen] = useState(false);

  const handleTechniqueChange = useCallback((technique: Technique | null) => {
    if (hasLogo && selectedTechnique && technique && technique.id !== selectedTechnique.id) {
      setPendingTechnique(technique);
      setTechniqueChangeDialogOpen(true);
      return;
    }
    setSelectedTechnique(technique);
    setGeneratedMockup(null);
    if (technique && techniqueNeedsColorConfig(technique.name, technique.code)) {
      setTechniqueColorConfig(null);
      setColorConfigDialogOpen(true);
    } else if (technique) {
      setTechniqueColorConfig({ category: classifyTechnique(technique.name, technique.code), isFullColor: true });
    } else {
      setTechniqueColorConfig(null);
    }
  }, [hasLogo, selectedTechnique, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig]);

  const confirmTechniqueChange = useCallback(() => {
    setSelectedTechnique(pendingTechnique);
    setGeneratedMockup(null);
    setTechniqueChangeDialogOpen(false);
    setPendingTechnique(null);
    toast.info(`Técnica alterada para ${pendingTechnique?.name}. Dimensões ajustadas automaticamente.`, { duration: 3000 });
    if (pendingTechnique && techniqueNeedsColorConfig(pendingTechnique.name, pendingTechnique.code)) {
      setTechniqueColorConfig(null);
      setTimeout(() => setColorConfigDialogOpen(true), 300);
    } else if (pendingTechnique) {
      setTechniqueColorConfig({ category: classifyTechnique(pendingTechnique.name, pendingTechnique.code), isFullColor: true });
    }
  }, [pendingTechnique, setSelectedTechnique, setGeneratedMockup, setTechniqueColorConfig]);

  return {
    pendingTechnique,
    techniqueChangeDialogOpen,
    setTechniqueChangeDialogOpen,
    colorConfigDialogOpen,
    setColorConfigDialogOpen,
    handleTechniqueChange,
    confirmTechniqueChange,
  };
}
