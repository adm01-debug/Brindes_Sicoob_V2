import { useMemo, type ReactNode } from "react";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppPreviewProps {
  message: string;
  images: string[];
  selectedImages: Set<number>;
  contactName?: string;
}

const BUBBLE_TEXT = "hsl(0, 0%, 91%)";
const META_TEXT = "hsla(0, 0%, 100%, 0.45)";
const BUBBLE_OUT = "hsl(153, 18%, 18%)";
const TICK_COLOR = "hsl(199, 80%, 55%)";

function formatMessage(message: string) {
  return message.split("\n").map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{line.split(/(\*[^*]+\*)/g).map((part, partIndex) => part.startsWith("*") && part.endsWith("*") ? <strong key={partIndex} className="font-semibold">{part.slice(1, -1)}</strong> : <span key={partIndex}>{part}</span>)}</span>);
}

function ChatHeader({ contactName }: { contactName?: string }) {
  return <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: "hsl(200, 12%, 13%)" }}><div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: "hsl(153, 30%, 30%)", color: BUBBLE_TEXT }}>{(contactName || "C").charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: BUBBLE_TEXT }}>{contactName || "Cliente"}</p><p className="text-[10px]" style={{ color: META_TEXT }}>online</p></div></div>;
}

function PhotoBubble({ photos, time }: { photos: string[]; time: string }) {
  if (photos.length === 0) return null;
  return <div className="flex justify-end mb-1"><div className="rounded-lg p-1 max-w-[65%] shadow-sm" style={{ backgroundColor: BUBBLE_OUT }}><div className={cn("grid gap-0.5 rounded-md overflow-hidden", photos.length === 1 && "grid-cols-1", photos.length >= 2 && "grid-cols-2")}>{photos.slice(0, 4).map((image, index) => <div key={index} className={cn("relative bg-black/20 overflow-hidden", photos.length === 1 ? "aspect-[4/3]" : "aspect-square", photos.length === 3 && index === 0 && "col-span-2 aspect-[2/1]")}><img src={image} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />{photos.length > 4 && index === 3 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-primary-foreground text-lg font-bold">+{photos.length - 4}</span></div>}</div>)}</div><MessageTime time={time} /></div></div>;
}

function MessageTime({ time }: { time: string }) {
  return <div className="flex justify-end items-center gap-1 mt-1"><span className="text-[10px]" style={{ color: META_TEXT }}>{time}</span><CheckCheck className="h-3 w-3" style={{ color: TICK_COLOR }} /></div>;
}

function TextBubble({ message, time }: { message: ReactNode; time: string }) {
  return <div className="flex justify-end"><div className="rounded-lg px-3 py-2 max-w-[85%] shadow-sm relative" style={{ backgroundColor: BUBBLE_OUT }}><div className="absolute -right-1.5 top-0 w-3 h-3" style={{ backgroundColor: BUBBLE_OUT, clipPath: "polygon(0 0, 100% 0, 0 100%)" }} /><p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: BUBBLE_TEXT }}>{message}</p><MessageTime time={time} /></div></div>;
}

/**
 * Renders a message preview styled like a WhatsApp chat bubble.
 * Automatically uses WhatsApp dark mode colors to match the app's dark theme.
 */
export function WhatsAppPreview({
  message,
  images,
  selectedImages,
  contactName,
}: WhatsAppPreviewProps) {
  const selectedPhotos = useMemo(
    () => images.filter((_, i) => selectedImages.has(i)),
    [images, selectedImages]
  );

  const formattedMessage = useMemo(() => formatMessage(message), [message]);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <ChatHeader contactName={contactName} />
      <div
        className="p-2 min-h-[80px] max-h-[150px] overflow-y-auto"
        style={{
          backgroundColor: "hsl(200, 15%, 8%)",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        <PhotoBubble photos={selectedPhotos} time={timeStr} />
        <TextBubble message={formattedMessage} time={timeStr} />
      </div>
    </div>
  );
}
