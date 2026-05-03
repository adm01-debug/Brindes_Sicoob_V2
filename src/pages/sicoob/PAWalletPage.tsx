import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function PAWalletPage() {
  return (
    <div className="container mx-auto p-6 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-center space-x-2">
          <Wallet className="w-6 h-6 text-primary" />
          <CardTitle>Minha Verba (PA)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo de gestão de verba em implementação para paridade 10/10.</p>
        </CardContent>
      </Card>
    </div>
  );
}
