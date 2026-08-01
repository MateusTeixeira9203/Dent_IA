"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function Combobox<Value>({ ...props }: ComboboxPrimitive.Root.Props<Value, false>) {
  return <ComboboxPrimitive.Root data-slot="combobox" {...props} />
}

function ComboboxInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text-primary outline-none focus:border-teal disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

function ComboboxContent({
  className,
  children,
  ...props
}: ComboboxPrimitive.Popup.Props) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={6} className="w-[var(--anchor-width)]">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "z-50 max-h-64 w-full overflow-auto rounded-xl hero-glass border border-border p-1 text-sm shadow-lg outline-none duration-100 backdrop-blur-sm",
            "data-open:animate-in data-open:fade-in-0",
            "data-closed:animate-out data-closed:fade-out-0",
            className
          )}
          {...props}
        >
          <ComboboxPrimitive.Empty className="px-3 py-2 text-xs text-text-secondary empty:m-0 empty:p-0" />
          <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-text-primary outline-none data-highlighted:bg-teal/10 data-highlighted:text-teal",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 shrink-0" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export { Combobox, ComboboxInput, ComboboxContent, ComboboxItem }
