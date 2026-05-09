import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, ArrowRight, History, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function AIOrderPredictor() {
  const suggestions = [
    { name: "Kit Boas-Vindas Cooperado", reason: "Alta demanda histórica em Maio", items: 3, prob: "94%", detail: "Baseado em 12 PAs similares" },
    { name: "Reposição Brindes Institucionais", reason: "Estoque crítico projetado (15 dias)", items: 5, prob: "87%", detail: "Tendência de consumo acelerada" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sugestões Preditivas (IA)</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:border-purple-200 cursor-pointer group transition-all bg-gradient-to-br from-white to-purple-50/30">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 rounded-lg bg-purple-100/50">
                    <Package className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                    {s.prob} confiança
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">{s.name}</h4>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                  <History className="h-3 w-3" /> {s.reason}
                </p>
                <p className="text-[9px] text-indigo-600 font-semibold mb-4">{s.detail}</p>
                <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] font-bold group-hover:bg-purple-600 group-hover:text-white border border-purple-100">
                  Importar Estrutura <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
