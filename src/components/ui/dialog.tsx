"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { useModal } from "@/contexts/modal-context"

/**
 * Modal width scale. Replaces per-call-site widths so modals are consistent.
 * Sizes are viewport-aware (the vw term keeps them inside the screen on mobile).
 */
export const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] z-[100] grid w-[calc(100vw-2rem)] max-w-[var(--dialog-max)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border-2 border-border bg-card p-6 text-card-foreground shadow-hard duration-200",
  {
    variants: {
      size: {
        sm: "[--dialog-max:24rem]",
        md: "[--dialog-max:32rem]",
        lg: "[--dialog-max:42rem]",
        xl: "[--dialog-max:56rem]",
        "2xl": "[--dialog-max:72rem]",
        full: "[--dialog-max:96rem]",
      },
    },
    defaultVariants: { size: "md" },
  }
)

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {}

const Dialog = ({ open, onOpenChange, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  const { openModal, closeModal } = useModal();

  // Manage modal context state.
  // CONTRACT: openModal/closeModal are a counter (see modal-context.tsx) so nested
  // modals don't prematurely re-show the header. Do not change to a boolean.
  React.useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      openModal();
    } else {
      document.body.classList.remove('modal-open');
      closeModal();
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
      closeModal();
    };
  }, [open, openModal, closeModal]);

  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props} />;
};

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // z-[100] clears the sidebar and bottom nav, which are both z-50.
      "fixed inset-0 z-[100] bg-foreground/60",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-foreground opacity-60 transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-display text-lg font-semibold leading-tight tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[13px] text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}