"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check } from "lucide-react";
import { useRef } from "react";
export function Brand() {
  return (
    <span className="brand">
      <Check size={18} strokeWidth={2.8} />
      <span>odal</span>
    </span>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  drawer = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  drawer?: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          ref={contentRef}
          onOpenAutoFocus={(event) => {
            const field = contentRef.current?.querySelector<HTMLElement>(
              "textarea, input:not([type=radio]):not([disabled]), select:not([disabled])",
            );
            if (field) {
              event.preventDefault();
              field.focus();
            }
          }}
          className={drawer ? "dialog drawer" : "dialog"}
          aria-describedby={description ? "modal-description" : undefined}
        >
          <div className="dialog-header">
            <Dialog.Title className="dialog-title">{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="닫기">
              <X size={19} />
            </Dialog.Close>
          </div>
          {description && (
            <Dialog.Description
              id="modal-description"
              className="muted dialog-description"
            >
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
