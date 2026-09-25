"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string };
const emptyValue = "__lsms_empty_option__";

export function CustomSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  emptyMessage = "No options available yet.",
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
  className = "",
}: {
  id: string;
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  return (
    <Select.Root
      value={
        value ||
        (options.some((option) => option.value === "") ? emptyValue : undefined)
      }
      onValueChange={(selected) =>
        onValueChange(selected === emptyValue ? "" : selected)
      }
      disabled={disabled}
      required={required}
      name={id}
    >
      <Select.Trigger
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`ui-input custom-select-trigger flex items-center justify-between gap-3 text-left ${className}`}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="shrink-0 text-[#426047]">
          <ChevronDown size={18} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          collisionPadding={12}
          className="custom-select-content z-[100] max-h-[min(320px,50dvh)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border-2 border-[#315b3d] bg-white p-1.5 shadow-[0_18px_48px_rgba(14,41,23,.28)]"
        >
          <Select.Viewport className="max-h-[min(305px,48dvh)] overflow-y-auto">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value || emptyValue}
                className="custom-select-option relative flex min-h-11 cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm text-[#183b29] outline-none data-[highlighted]:bg-[#244b32] data-[highlighted]:text-white data-[state=checked]:bg-[#e4f1e6] data-[state=checked]:font-semibold data-[highlighted]:data-[state=checked]:bg-[#244b32]"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-3">
                  <Check size={17} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
            {!options.some((option) => option.value !== "") && (
              <div
                className="border-t border-[#d6e4d7] px-3 py-3 text-sm leading-5 text-[#3c5943]"
                role="note"
              >
                {emptyMessage}
              </div>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
