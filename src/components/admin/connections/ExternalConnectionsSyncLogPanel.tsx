import { forwardRef } from "react";
import { Card } from "@/components/ui/card";

export const ExternalConnectionsSyncLogPanel = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <Card ref={ref}>
      {/* ... keep existing code */}
    </Card>
  );
});

ExternalConnectionsSyncLogPanel.displayName = 'ExternalConnectionsSyncLogPanel';
