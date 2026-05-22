import { useState, useEffect } from 'react';

interface Prediction {
  name: string;
  reason: string;
  items: number;
  prob: string;
  detail: string;
}

export function useAIOrderPredictor() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulando chamada de API para IA
    const timer = setTimeout(() => {
      setPredictions([
        { 
          name: "Kit Boas-Vindas Cooperado", 
          reason: "Alta demanda histórica em Maio", 
          items: 3, 
          prob: "94%", 
          detail: "Baseado em 12 PAs similares" 
        },
        { 
          name: "Reposição Brindes Institucionais", 
          reason: "Estoque crítico projetado (15 dias)", 
          items: 5, 
          prob: "87%", 
          detail: "Tendência de consumo acelerada" 
        },
        {
          name: "Lote de Agendas 2027",
          reason: "Planejamento antecipado sugerido",
          items: 1,
          prob: "82%",
          detail: "Garante melhores custos de produção"
        }
      ]);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return { predictions, isLoading };
}
