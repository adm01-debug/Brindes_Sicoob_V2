import React, { type ReactNode } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  FileText, 
  Users, 
  Search, 
  FolderOpen, 
  Heart,
  ShoppingCart,
  Bell,
  TrendingUp,
  Inbox,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateVariant = 
  | "products" 
  | "quotes" 
  | "orders" 
  | "clients" 
  | "search" 
  | "collections"
  | "favorites"
  | "cart"
  | "notifications"
  | "analytics"
  | "generic";

const PRIMARY_TEXT = "text-primary";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

const variants: Record<EmptyStateVariant, { 
  icon: typeof Package; 
  title: string; 
  description: string;
  color: string;
}> = {
  products: {
    icon: Package,
    title: "Nenhum produto encontrado",
    description: "Não encontramos produtos com os filtros selecionados. Tente ajustar sua busca.",
    color: PRIMARY_TEXT
  },
  quotes: {
    icon: FileText,
    title: "Nenhum orçamento ainda",
    description: "Comece criando seu primeiro orçamento para um cliente.",
    color: PRIMARY_TEXT
  },
  orders: {
    icon: ShoppingCart,
    title: "Nenhum pedido encontrado",
    description: "Os pedidos aparecerão aqui quando os orçamentos forem aprovados.",
    color: "text-orange"
  },
  clients: {
    icon: Users,
    title: "Nenhum cliente cadastrado",
    description: "Adicione clientes para começar a criar orçamentos personalizados.",
    color: PRIMARY_TEXT
  },
  search: {
    icon: Search,
    title: "Sem resultados",
    description: "Não encontramos nada para sua busca. Tente termos diferentes.",
    color: "text-muted-foreground"
  },
  collections: {
    icon: FolderOpen,
    title: "Nenhuma coleção criada",
    description: "Organize seus produtos favoritos em coleções personalizadas.",
    color: "text-warning"
  },
  favorites: {
    icon: Heart,
    title: "Nenhum favorito ainda",
    description: "Marque produtos como favoritos para acessá-los rapidamente.",
    color: "text-destructive"
  },
  cart: {
    icon: ShoppingCart,
    title: "Carrinho vazio",
    description: "Adicione produtos ao carrinho para criar um orçamento.",
    color: PRIMARY_TEXT
  },
  notifications: {
    icon: Bell,
    title: "Nenhuma notificação",
    description: "Você está em dia! Novas notificações aparecerão aqui.",
    color: PRIMARY_TEXT
  },
  analytics: {
    icon: TrendingUp,
    title: "Sem dados disponíveis",
    description: "Os dados analíticos aparecerão quando houver atividade.",
    color: "text-success"
  },
  generic: {
    icon: Inbox,
    title: "Nada por aqui",
    description: "Não há itens para exibir no momento.",
    color: "text-muted-foreground"
  }
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState({
  variant = "generic",
  title,
  description,
  action,
  secondaryAction,
  className,
  children
}, ref) {
  const config = variants[variant];
  const Icon = config.icon;
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 15,
          delay: 0.1 
        }}
        className="relative mb-6"
      >
        {/* Background circles */}
        <div className="absolute inset-0 -m-4">
          <div className="absolute inset-0 rounded-full bg-muted/50 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-muted/30" />
        </div>
        
        {/* Icon */}
        <div className={cn(
          "relative z-10 p-6 rounded-2xl bg-gradient-to-br from-muted to-muted/50",
          "border border-border shadow-sm"
        )}>
          <Icon className={cn("h-12 w-12", config.color)} strokeWidth={1.5} />
        </div>
      </motion.div>
      
      {/* Text content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-2 max-w-md"
      >
        <h3 className="font-display text-lg font-semibold text-foreground">
          {title || config.title}
        </h3>
        <p className="text-muted-foreground">
          {description || config.description}
        </p>
      </motion.div>
      
      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-3 mt-6"
        >
          {action && (
            <Button onClick={action.onClick} className="gap-2 bg-sicoob-green hover:bg-sicoob-green/90 text-white">
              <Plus className="h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} className="border-sicoob-green text-sicoob-green-dark hover:bg-sicoob-green/5">
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
      
      {/* Custom content */}
      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
});

// Compact version for inline use
export function InlineEmptyState({ 
  message, 
  icon = Inbox,
  className 
}: { 
  message: string; 
  icon?: typeof Inbox;
  className?: string;
}) {
  const InlineIcon = icon;
  return (
    <div className={cn(
      "flex items-center gap-3 py-4 px-4 rounded-lg bg-muted/30",
      "text-muted-foreground text-sm",
      className
    )}>
      <InlineIcon className="h-5 w-5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
