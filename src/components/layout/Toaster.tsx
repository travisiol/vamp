"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { BatMark } from "@/components/brand/BatMark";
import { dismiss, useToasts } from "@/lib/toast";

/** Notifications. A successful transaction sends a small bat across the card. */
export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="panel pointer-events-auto relative w-full overflow-hidden p-4 pr-10 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] sm:w-[360px]"
            role="status"
          >
            {t.kind === "success" ? (
              <motion.div
                aria-hidden
                className="absolute top-3 left-0 text-chrome"
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 420, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.6, ease: "easeInOut", delay: 0.15 }}
              >
                <BatMark size={12} variant="solid" />
              </motion.div>
            ) : null}
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.kind === "error" ? "bg-blood-2" : t.kind === "success" ? "bg-chrome" : "bg-bone-3"}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-wide text-bone">{t.title}</p>
                {t.body ? <p className="mt-1 text-[13px] leading-snug text-bone-2 break-words">{t.body}</p> : null}
                {t.href ? (
                  <a href={t.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs tracking-wider text-bone uppercase hover:text-blood-3">
                    {t.hrefLabel ?? "Open"} <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="absolute top-3 right-3 rounded-md p-1 text-bone-3 transition hover:text-bone">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
