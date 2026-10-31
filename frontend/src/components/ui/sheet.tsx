"use client";

import { X } from "lucide-react";
import { AnimatePresence, useDragControls, type PanInfo } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { duration, exitDuration, spring } from "@/lib/motion";
import { DESKTOP, useMediaQuery } from "@/lib/use-media-query";
import { IconButton } from "./icon-button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
export const DISMISS_PX = 120;
const DISMISS_VELOCITY = 600;

export function shouldDismiss(offsetY: number, velocityY: number): boolean {
  return offsetY > DISMISS_PX || velocityY > DISMISS_VELOCITY;
}

type SheetProps = {
  open: boolean;
  onClose: () => void;
  onExitComplete?: () => void;
  label: string;
  closeLabel?: string;
  // drawer: bottom sheet on mobile, right drawer from md (FR-CART-03).
  // modal: full page on mobile, centred dialog from md (FR-CAT-05).
  variant: "drawer" | "modal";
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function Sheet({
  open,
  onClose,
  onExitComplete,
  label,
  closeLabel = "Close",
  variant,
  title,
  footer,
  children,
}: SheetProps) {
  const desktop = useMediaQuery(DESKTOP);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const pastThreshold = useRef(false);
  const dragControls = useDragControls();
  const draggable = variant === "drawer" && !desktop;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      const panel = panelRef.current;
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active) || (e.shiftKey && active === first)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, [open]);

  const enter = draggable
    ? { y: "100%" }
    : variant === "drawer"
      ? { x: "100%" }
      : { opacity: 0, y: desktop ? 16 : 32 };

  function onDrag(_: unknown, info: PanInfo) {
    const past = info.offset.y > DISMISS_PX;
    if (past !== pastThreshold.current) {
      pastThreshold.current = past;
      if (past) haptic("tick");
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    pastThreshold.current = false;
    if (shouldDismiss(info.offset.y, info.velocity.y)) onCloseRef.current();
  }

  const close = (
    <IconButton ref={closeRef} label={closeLabel} onClick={() => onCloseRef.current()}>
      <X className="size-5" aria-hidden="true" />
    </IconButton>
  );

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <div
          key="sheet"
          className={cn(
            "fixed inset-0 z-50 flex",
            variant === "drawer"
              ? "flex-col justify-end md:flex-row"
              : "md:items-center md:justify-center md:p-4",
          )}
          onClick={() => onCloseRef.current()}
        >
          <m.div
            aria-hidden="true"
            className="absolute inset-0 bg-ink/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.short } }}
            exit={{ opacity: 0, transition: { duration: exitDuration(duration.short) } }}
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            initial={enter}
            animate={{ x: 0, y: 0, opacity: 1, transition: spring.settle }}
            exit={{ ...enter, transition: { duration: exitDuration(duration.medium) } }}
            drag={draggable ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            className={cn(
              "relative flex flex-col bg-ink-raised text-bone",
              variant === "drawer"
                ? "max-h-[85dvh] w-full border-t border-rule md:ml-auto md:h-full md:max-h-none md:w-[26rem] md:border-t-0 md:border-l"
                : "h-full w-full overflow-y-auto overscroll-contain md:h-auto md:max-h-[90dvh] md:max-w-3xl md:border md:border-rule",
            )}
          >
            {title ? (
              <div
                onPointerDown={(e) => draggable && dragControls.start(e)}
                className={cn("border-b border-rule", draggable && "touch-none")}
              >
                {draggable && (
                  <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 bg-bone-muted/50" />
                )}
                <div className="flex items-center justify-between gap-2 pl-4 pr-1">
                  {title}
                  {close}
                </div>
              </div>
            ) : (
              // Floats over the content: the row takes no height and only
              // the button takes clicks.
              <div className="pointer-events-none sticky top-0 z-10 -mb-[3.25rem] flex justify-end p-1">
                <div className="pointer-events-auto bg-ink-raised/80">{close}</div>
              </div>
            )}
            <div
              className={cn(
                variant === "drawer" && "min-h-0 flex-1 overflow-y-auto overscroll-contain",
              )}
            >
              {children}
            </div>
            {footer}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
