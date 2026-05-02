import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Landmark, Wallet, Users } from "lucide-react";
import { CooperativasTab } from "./tabs/CooperativasTab";
import { PAsTab } from "./tabs/PAsTab";
import { BudgetsTab } from "./tabs/BudgetsTab";
import { UserAssignmentTab } from "./tabs/UserAssignmentTab";

const SicoobManagementPage = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestão Sicoob</h1>
        <p className="text-muted-foreground">
          Administração de Singulares, PAs e Verbas para o ecossistema Sicoob.
        </p>
      </div>

      <Tabs defaultValue="cooperativas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="cooperativas" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            <span>Singulares</span>
          </TabsTrigger>
          <TabsTrigger value="pas" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>PAs</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span>Verbas</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Vínculos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cooperativas">
          <CooperativasTab />
        </TabsContent>

        <TabsContent value="pas">
          <PAsTab />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetsTab />
        </TabsContent>

        <TabsContent value="users">
          <UserAssignmentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SicoobManagementPage;
