"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ExitGameModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitGameModal({
  open,
  title = "Exit current game?",
  description = "Your current progress may be lost if you leave now.",
  confirmLabel = "Yes, Exit",
  cancelLabel = "Continue Game",
  onConfirm,
  onCancel,
}: ExitGameModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
      <Card className="w-full max-w-md space-y-4">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Confirm Exit
        </p>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {description}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" size="lg" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
