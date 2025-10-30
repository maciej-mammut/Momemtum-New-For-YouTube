"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type ToggleGroupControlledValue = string | string[] | null | undefined

interface ToggleGroupContextValue {
  type: "single" | "multiple"
  value: string[]
  disabled?: boolean
  allowEmpty: boolean
  onChange: (next: string[]) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(
  null,
)

const toArray = (
  value: ToggleGroupControlledValue,
  type: "single" | "multiple",
): string[] => {
  if (value == null) {
    return []
  }

  if (Array.isArray(value)) {
    return type === "single" ? value.slice(0, 1) : value
  }

  return type === "single" ? [value] : [value]
}

const fromArray = (
  items: string[],
  type: "single" | "multiple",
): string | string[] | null => {
  if (type === "single") {
    return items[0] ?? null
  }

  return items
}

interface ToggleGroupProps
  extends Omit<React.ComponentProps<"div">, "defaultValue" | "value" | "onChange"> {
  type?: "single" | "multiple"
  value?: ToggleGroupControlledValue
  defaultValue?: ToggleGroupControlledValue
  onValueChange?: (value: string | string[] | null) => void
  disabled?: boolean
  allowEmpty?: boolean
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      className,
      type = "single",
      value,
      defaultValue,
      onValueChange,
      disabled,
      allowEmpty = false,
      children,
      role = "group",
      ...props
    },
    ref,
  ) => {
    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = React.useState<string[]>(() =>
      toArray(defaultValue, type),
    )

    const resolvedValue = isControlled
      ? toArray(value, type)
      : internalValue

    const handleChange = React.useCallback(
      (next: string[]) => {
        if (!isControlled) {
          setInternalValue(next)
        }

        onValueChange?.(fromArray(next, type))
      },
      [isControlled, onValueChange, type],
    )

    const contextValue = React.useMemo<ToggleGroupContextValue>(
      () => ({
        type,
        value: resolvedValue,
        disabled,
        allowEmpty,
        onChange: handleChange,
      }),
      [type, resolvedValue, disabled, allowEmpty, handleChange],
    )

    return (
      <ToggleGroupContext.Provider value={contextValue}>
        <div
          ref={ref}
          role={role}
          aria-disabled={disabled ? true : undefined}
          data-disabled={disabled ? "" : undefined}
          className={cn("inline-flex gap-1", className)}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    )
  },
)
ToggleGroup.displayName = "ToggleGroup"

interface ToggleGroupItemProps
  extends Omit<React.ComponentProps<"button">, "value" | "onChange"> {
  value: string
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, disabled, type = "button", ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)

    if (!context) {
      throw new Error(
        "ToggleGroupItem must be used within a ToggleGroup component",
      )
    }

    const isDisabled = disabled || context.disabled
    const isPressed = context.value.includes(value)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      props.onClick?.(event)
      if (event.defaultPrevented) return
      if (isDisabled) {
        event.preventDefault()
        return
      }

      const current = context.value
      let next = current

      if (context.type === "single") {
        if (isPressed && !context.allowEmpty) {
          return
        }

        next = isPressed ? [] : [value]
      } else {
        if (isPressed) {
          next = current.filter((item) => item !== value)
        } else {
          next = [...current, value]
        }
      }

      context.onChange(next)
    }

    return (
      <button
        ref={ref}
        type={type as "button" | "submit" | "reset"}
        role="button"
        aria-pressed={isPressed}
        data-state={isPressed ? "on" : "off"}
        data-value={value}
        data-disabled={isDisabled ? "" : undefined}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-transparent bg-muted px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isPressed && "bg-primary text-primary-foreground shadow-sm",
          isDisabled && "opacity-50",
          className,
        )}
        onClick={handleClick}
        {...props}
      />
    )
  },
)
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
