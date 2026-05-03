import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  notes?: string | null;
  status: string;
}

export function QuoteApprovalNotes({ notes, status }: Props) {
  if (!notes || status !== "rejected_singular") return null;

  return (
    <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 animate-in fade-in slide-in-from-left-2 duration-300">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-sm font-bold">Feedback da Singular</AlertTitle>
      <AlertDescription className="text-xs mt-1 whitespace-pre-wrap">
        {notes}
      </AlertDescription>
    </Alert>
  );
}
