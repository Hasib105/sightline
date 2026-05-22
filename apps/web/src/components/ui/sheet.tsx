"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet(props: DrawerPrimitive.Root.Props) {
  return (
    <DrawerPrimitive.Root
      modal
      swipeDirection="right"
      {...props}
    />
  );
}

function SheetTrigger(props: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger {...props} />;
}

function SheetClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close {...props} />;
}

function SheetContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className="dashboard-sheet-backdrop" />
      <DrawerPrimitive.Viewport>
        <DrawerPrimitive.Popup className={cn("dashboard-sheet", className)} {...props}>
          {children}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      className={cn("mt-0.5 text-xs leading-5 text-muted-foreground", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", className)} {...props} />
  );
}

function SheetCloseButton({ className, ...props }: DrawerPrimitive.Close.Props) {
  return (
    <DrawerPrimitive.Close
      aria-label="Close panel"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_20%,transparent)]",
        className
      )}
      {...props}
    >
      <X className="size-4" />
    </DrawerPrimitive.Close>
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
