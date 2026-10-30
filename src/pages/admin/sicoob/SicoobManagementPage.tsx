import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Landmark, Wallet, Users, BellRing, UserCog } from "lucide-react";
import { CooperativasTab } from "./tabs/CooperativasTab";
import { PAsTab } from "./tabs/PAsTab";
import { BudgetsTab } from "./tabs/BudgetsTab";
import { UserAssignmentTab } from "./tabs/UserAssignmentTab";
import { NotificationSettingsTab } from "./tabs/NotificationSettingsTab";
import { ApprovalDelegationsTab } from "./tabs/ApprovalDelegationsTab";

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
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 xl:w-[930px] xl:grid-cols-6">
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
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            <span>Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="delegations" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span>Delegações</span>
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

        <TabsContent value="notifications">
          <NotificationSettingsTab />
        </TabsContent>

        <TabsContent value="delegations">
          <ApprovalDelegationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SicoobManagementPage;
