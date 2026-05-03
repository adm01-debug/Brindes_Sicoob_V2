import React from "react";
import { cn } from "@/lib/utils";

interface OrderHistoryDiffProps {
  oldValue: any;
  newValue: any;
}

export const OrderHistoryDiff: React.FC<OrderHistoryDiffProps> = ({ oldValue, newValue }) => {
  if (!oldValue && !newValue) return null;

  const renderValue = (val: any) => {
    if (val === null || val === undefined) return "vazio";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono p-2 bg-muted/40 rounded border border-border/40">
      <div className="space-y-1">
        <span className="text-muted-foreground uppercase tracking-wider block">Antes</span>
        <div className="bg-red-50 text-red-700 p-1.5 rounded line-through decoration-red-300 decoration-2">
          {renderValue(oldValue)}
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground uppercase tracking-wider block">Depois</span>
        <div className="bg-green-50 text-green-700 p-1.5 rounded font-bold">
          {renderValue(newValue)}
        </div>
      </div>
    </div>
  );
};
