"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { Check, ChevronDown, Minus } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DashboardSelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export function DashboardSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled,
  name,
  className,
  triggerClassName,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: DashboardSelectOption[];
  placeholder?: ReactNode;
  disabled?: boolean;
  name?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const items = options.map((option) => ({ value: option.value, label: option.label }));

  return (
    <Select.Root
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onValueChange(nextValue);
        }
      }}
      items={items}
      name={name}
      disabled={disabled}
      modal={false}
    >
      <Select.Trigger
        className={cn(
          "dashboard-select-trigger inline-flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-[var(--dashboard-border)] bg-card px-2.5 text-left text-sm text-foreground shadow-none outline-none transition hover:border-[color-mix(in_oklab,var(--dashboard-accent)_28%,var(--dashboard-border))] focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_18%,transparent)] data-disabled:cursor-not-allowed data-disabled:bg-muted data-disabled:text-muted-foreground",
          triggerClassName,
          className
        )}
      >
        <Select.Value placeholder={placeholder}>
          {(selectedValue) =>
            options.find((option) => option.value === String(selectedValue ?? ""))?.label ?? placeholder
          }
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={5} alignItemWithTrigger={false} className="z-[80]">
          <Select.Popup className="max-h-[min(18rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-popover p-1 text-popover-foreground shadow-2xl outline-none">
            <Select.ScrollUpArrow className="flex h-5 items-center justify-center text-muted-foreground">
              <ChevronDown className="size-3 rotate-180" />
            </Select.ScrollUpArrow>
            <Select.List className="max-h-[inherit] overflow-y-auto outline-none">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="grid cursor-default grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-[0.4rem] px-2 py-1.5 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-[var(--dashboard-accent-soft)] data-highlighted:text-foreground data-selected:text-foreground"
                >
                  <Select.ItemIndicator className="text-[var(--dashboard-accent)]">
                    <Check className="size-3.5" />
                  </Select.ItemIndicator>
                  <Select.ItemText className="truncate">{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow className="flex h-5 items-center justify-center text-muted-foreground">
              <ChevronDown className="size-3" />
            </Select.ScrollDownArrow>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export function DashboardCheckbox({
  checked,
  onCheckedChange,
  disabled,
  name,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      name={name}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[0.3rem] border border-[var(--dashboard-border)] bg-card text-[var(--dashboard-accent)] outline-none transition data-checked:border-[var(--dashboard-accent)] data-checked:bg-[var(--dashboard-accent)] data-checked:text-[var(--dashboard-accent-foreground)] data-disabled:cursor-not-allowed data-disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_22%,transparent)]",
        className
      )}
    >
      <Checkbox.Indicator>
        {checked ? <Check className="size-3" /> : <Minus className="size-3 opacity-0" />}
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

export function DashboardCheckboxGroup({
  values,
  onValuesChange,
  options,
  disabled,
}: {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: DashboardSelectOption[];
  disabled?: boolean;
}) {
  const toggle = (value: string, checked: boolean) => {
    if (checked) {
      onValuesChange([...values, value]);
      return;
    }
    onValuesChange(values.filter((item) => item !== value));
  };

  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2">
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-foreground hover:bg-[var(--dashboard-accent-soft)]",
              (disabled || option.disabled) && "cursor-not-allowed opacity-50"
            )}
          >
            <DashboardCheckbox
              checked={checked}
              disabled={disabled || option.disabled}
              onCheckedChange={(next) => toggle(option.value, next)}
              aria-label={typeof option.label === "string" ? option.label : option.value}
            />
            <span className="truncate">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function DashboardSwitch({
  checked,
  onCheckedChange,
  disabled,
  name,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      name={name}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-[var(--dashboard-border)] bg-muted p-0.5 outline-none transition data-checked:border-[var(--dashboard-accent)] data-checked:bg-[var(--dashboard-accent)] data-disabled:cursor-not-allowed data-disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_22%,transparent)]",
        className
      )}
    >
      <Switch.Thumb className="block size-3.5 rounded-full bg-background shadow-sm transition-transform data-checked:translate-x-4 data-checked:bg-[var(--dashboard-accent-foreground)]" />
    </Switch.Root>
  );
}
