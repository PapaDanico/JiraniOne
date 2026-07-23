import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

// Lightweight toast — deliberately not the full shadcn/radix machinery.
// One job: a consistent "the app heard you" moment after actions whose
// dialog closes silently. Success auto-dismisses; errors stay a little
// longer. Positioned above the bottom nav on mobile.

interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "error";
}

const ToastContext = createContext<(message: string, variant?: "success" | "error") => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

function Toast({ item, onGone }: { item: ToastItem; onGone: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.push(window.setTimeout(() => setVisible(true), 20));
    const ttl = item.variant === "error" ? 5000 : 2800;
    timers.current.push(window.setTimeout(() => setVisible(false), ttl));
    timers.current.push(window.setTimeout(() => onGone(item.id), ttl + 350));
    return () => timers.current.forEach(clearTimeout);
  }, [item.id, item.variant, onGone]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg text-sm font-semibold transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      } ${
        item.variant === "error"
          ? "bg-[#B71C1C] text-white"
          : "bg-[#1B5E20] text-white"
      }`}
    >
      {item.variant === "error"
        ? <AlertCircle className="h-4 w-4 shrink-0" />
        : <CheckCircle2 className="h-4 w-4 shrink-0" />}
      {item.message}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToasts((cur) => [...cur.slice(-2), { id: nextId++, message, variant }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onGone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
