"use client";

import { type ReactNode } from "react";

import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function InspectorDrawer({
  open,
  onOpenChange,
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={className}>
        <SheetHeader>
          <div className="min-w-0">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <SheetCloseButton />
          </div>
        </SheetHeader>
        <SheetBody className={cn("space-y-3", bodyClassName)}>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}
