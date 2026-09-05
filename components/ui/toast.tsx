"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const newToast: Toast = { id, variant: "info" as ToastVariant, duration: 3000, ...toast };
      const newToasts = [...prev, newToast];
      return newToasts.slice(-3);
    });
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {typeof window !== "undefined" &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  React.useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  const Icon = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  }[toast.variant || "info"];

  return (
    <div
      className={cn(
        "flex w-80 items-center justify-between rounded-lg border border-border bg-white p-4 shadow-lg animate-in slide-in-from-right fade-in",
        {
          "border-success/50": toast.variant === "success",
          "border-danger/50": toast.variant === "error",
          "border-surface-alt": toast.variant === "info",
          "border-warning/50": toast.variant === "warning",
        }
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn("h-5 w-5", {
            "text-success": toast.variant === "success",
            "text-danger": toast.variant === "error",
            "text-text-muted": toast.variant === "info",
            "text-warning": toast.variant === "warning",
          })}
        />
        <p className="text-sm font-medium text-text">{toast.message}</p>
      </div>
      <button onClick={() => onRemove(toast.id)} className="text-text-muted hover:text-text">
        <X size={16} />
      </button>
    </div>
  );
}
