"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type ButtonProps = React.ComponentPropsWithoutRef<"button">

type SwitchProps = {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
} & Omit<ButtonProps, "onChange" | "value" | "role">

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({
    checked,
    onCheckedChange,
    className,
    disabled,
    onClick,
    onKeyDown,
    ...props
  }, ref) => {
    const handleToggle = (event: React.SyntheticEvent) => {
      if (disabled) {
        event.preventDefault()
        return
      }
      onCheckedChange?.(!checked)
    }

    return (
      <button
        {...props}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        data-slot="switch"
        data-state={checked ? "checked" : "unchecked"}
        data-disabled={disabled ? "" : undefined}
        disabled={disabled}
        className={cn(
          "inline-flex h-6 w-11 items-center rounded-full border border-transparent bg-muted transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          checked && "bg-primary",
          className
        )}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          handleToggle(event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleToggle(event)
          }
        }}
      >
        <span
          data-slot="switch-thumb"
          className={cn(
            "pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
