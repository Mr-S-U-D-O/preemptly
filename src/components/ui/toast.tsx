import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
}

const TOAST_EVENT = "custom-toast-event";

export const toast = (message: string, type: ToastType = "success") => {
  const event = new CustomEvent(TOAST_EVENT, { detail: { id: Date.now().toString(), message, type } });
  window.dispatchEvent(event);
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newToast = customEvent.detail;
      
      setToasts((prev) => [...prev, newToast]);
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100000] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border bg-white/90 backdrop-blur-md`}
          >
            {t.type === "success" && <CheckCircle size={18} className="text-[#5a8c12]" />}
            {t.type === "error" && <XCircle size={18} className="text-red-500" />}
            {t.type === "info" && <Info size={18} className="text-blue-500" />}
            <span className="text-sm font-bold text-slate-800 tracking-wide">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
