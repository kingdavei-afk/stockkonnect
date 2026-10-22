"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * Large : la modale s'affiche en volet latéral à partir de `sm` (fenêtre
   * ancrée à droite, pleine hauteur) et reste en feuille centrée sur mobile.
   * La fiche produit, dense, gagne ainsi de la place verticale et ne coupe
   * plus ses premiers champs sur les écrans bas.
   */
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        className={`card my-0 flex max-h-[92dvh] w-full flex-col rounded-b-none sm:my-8 sm:max-h-[85vh] sm:rounded-xl ${
          wide ? "sm:max-w-4xl lg:max-w-5xl" : "sm:max-w-lg"
        } p-4 sm:p-6`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn-secondary !p-2" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 sm:pr-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <button
      className="text-sm font-medium text-red-600 hover:underline"
      onClick={() => {
        if (confirm("Confirmer la suppression ?")) onConfirm();
      }}
    >
      Supprimer
    </button>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-sm text-slate-500">{message}</div>
  );
}
