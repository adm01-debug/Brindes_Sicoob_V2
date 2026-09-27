import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, History, Package, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAIOrderPredictor } from "@/hooks/sicoob/useAIOrderPredictor";
import { useNavigate } from "react-router-dom";

export function AIOrderPredictor() {
  const { predictions, sampleSize, windowStart, isLoading, error } = useAIOrderPredictor();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse bg-muted/20 border-border/40">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="h-6 w-20 bg-muted rounded" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded" />
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-8 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">Não foi possível calcular a recorrência dos produtos.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 px-1">
        <div className="flex items-center gap-2">
          <Repeat2 className="h-4 w-4 text-sicoob-green" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sinais de recompra observados</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Janela desde {windowStart.toLocaleDateString("pt-BR")} · amostra de {sampleSize} pedido(s) concluído(s).
        </p>
      </div>

      {predictions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Dados insuficientes: são necessários ao menos 3 pedidos concluídos e um produto presente em 2 pedidos distintos. Nenhuma probabilidade foi estimada.
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {predictions.map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:border-sicoob-green/50 cursor-pointer group transition-all bg-gradient-to-br from-white to-sicoob-green/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 rounded-lg bg-sicoob-green/10">
                    <Package className="h-4 w-4 text-sicoob-green-dark" />
                  </div>
                  <div className="text-[10px] font-bold text-sicoob-green-dark bg-sicoob-green/20 px-1.5 py-0.5 rounded border border-sicoob-green/30">
                    {s.orderOccurrences} de {s.sampleSize} pedidos
                  </div>
                </div>
                <h4 className="text-sm font-bold text-sicoob-green-dark mb-1">{s.name}</h4>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                  <History className="h-3 w-3" /> Último registro em {new Date(s.lastObservedAt).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-[9px] text-sicoob-green font-semibold mb-4">{s.totalQuantity} unidade(s) registradas na janela</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-8 text-[10px] font-bold transition-all border border-sicoob-green/10 group-hover:bg-sicoob-green group-hover:text-white"
                  onClick={() => navigate("/catalogo")}
                >
                  Iniciar novo pedido <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
}
