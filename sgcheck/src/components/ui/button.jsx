import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const variantStyles = {
  default: "btn-default",
  outline: "btn-outline",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-destructive",
  link: "underline text-primary",
}

const sizeStyles = {
  default: "",
  sm: "btn-sm",
  lg: "",
  icon: "btn-icon",
  "icon-sm": "btn-icon-sm",
  "icon-xs": "",
  "icon-lg": "",
}

const Button = React.forwardRef(
  (
    { className, variant = "default", size = "default", asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn("btn", variantStyles[variant] || "btn-default", sizeStyles[size] || "", className)}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
