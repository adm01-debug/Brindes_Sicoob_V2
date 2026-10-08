// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, Info, AlertCircle, ShoppingCart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { OrderEventAlerts } from "@/components/settings/OrderEventAlerts";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const navigate = useNavigate();

  return (
    <>
      <PageSEO title="Notificações" description="Suas notificações de pedidos e orçamentos" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Central de Notificações</h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" /> Preferências
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <div className="space-y-6">
                  <NotificationPreferences />
                  <OrderEventAlerts />
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              Marcar todas como lidas
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground">Carregando...</div>
          ) : !notifications?.length ? (
            <div className="py-20 text-center bg-card rounded-2xl border border-dashed border-border/60">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground">Você não tem notificações no momento.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-xl border transition-all flex gap-4 items-start ${n.is_read ? 'bg-background border-border/40 opacity-70' : 'bg-primary/5 border-primary/20 shadow-sm'}`}
              >
                <div className="mt-1">
                  {n.category === 'status' ? <Info className="h-5 w-5 text-primary" /> : 
                   n.category === 'order' ? <ShoppingCart className="h-5 w-5 text-blue-500" /> :
                   <AlertCircle className="h-5 w-5 text-warning" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold truncate">{n.title}</h3>
                    {!n.is_read && <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-2">
                      {!n.is_read && (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => markAsRead(n.id)}>
                          Marcar como lida
                        </Button>
                      )}
                      {n.action_url && (
                        <Button variant="secondary" size="sm" className="h-7 text-[10px]" onClick={() => navigate(n.action_url!)}>
                          Ver Detalhes
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
