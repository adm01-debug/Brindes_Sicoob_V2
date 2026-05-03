import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, Award, Clock, Target, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";

const DATA_MONTHLY = [
  { name: "Jan", valor: 45000 },
  { name: "Fev", valor: 52000 },
  { name: "Mar", valor: 48000 },
  { name: "Abr", valor: 61000 },
  { name: "Mai", valor: 55000 },
];

const DATA_CATEGORIES = [
  { name: "Mochilas", value: 35 },
  { name: "Escritório", value: 25 },
  { name: "Eletrônicos", value: 20 },
  { name: "Vestuário", value: 20 },
];

const COLORS = ["#003641", "#7DB61C", "#9DB7C3", "#E3E829"];

export default function SicoobKpiPage() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Analytics & KPIs</h1>
            <p className="text-muted-foreground">Indicadores estratégicos de performance SICOOB.</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar Dados
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-sicoob-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 4.250</div>
              <p className="text-xs text-green-600 mt-1 font-medium">+8% vs mês anterior</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">SLA de Aprovação</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.2h</div>
              <p className="text-xs text-muted-foreground mt-1">Tempo médio na Singular</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversão de Orçs</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">76%</div>
              <p className="text-xs text-green-600 mt-1 font-medium">Meta: 70%</p>
            </CardContent>
          </Card>
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Itens em Falta</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">3</div>
              <p className="text-xs text-red-600/80 mt-1 font-medium">Requer reposição</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-[1.5px]">
            <CardHeader>
              <CardTitle>Volume de Pedidos (R$)</CardTitle>
              <CardDescription>Evolução mensal do faturamento consolidado.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DATA_MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                  <Tooltip formatter={(val) => formatCurrency(val as number)} />
                  <Bar dataKey="valor" fill="#003641" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader>
              <CardTitle>Mix de Produtos</CardTitle>
              <CardDescription>Distribuição de pedidos por categoria principal.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DATA_CATEGORIES}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {DATA_CATEGORIES.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                {DATA_CATEGORIES.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-xs font-medium">{cat.name} ({cat.value}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
