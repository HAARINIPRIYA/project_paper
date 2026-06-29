import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeStyles = {
  default: "badge-default",
  secondary: "badge-secondary",
  destructive: "badge-destructive",
  outline: "badge-outline",
  ghost: "",
  link: "",
}

function Badge({
  className,
  variant = "default",
  ...props
}) {
  return (
    <span
      data-slot="badge"
      className={cn("badge", badgeStyles[variant] || "badge-default", className)}
      {...props} />
  );
}

export { Badge }
