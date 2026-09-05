"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, title, children, className }: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div 
        className={cn(
          "relative z-50 mt-auto sm:mt-0 flex h-[80vh] sm:h-full w-full flex-col bg-white border-t sm:border-t-0 sm:border-l border-border shadow-xl sm:ml-auto sm:w-[400px] sm:max-w-md animate-in slide-in-from-bottom sm:slide-in-from-right",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          {title && <h2 className="text-lg font-heading font-semibold text-text">{title}</h2>}
          <button 
            onClick={onClose} 
            className="rounded-full p-1 hover:bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
