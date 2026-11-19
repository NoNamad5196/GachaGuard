import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xs border px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wider uppercase whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-[var(--primary)]/60 bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_0_8px_rgba(212,255,42,0.2)]",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/60 bg-destructive/20 text-destructive shadow-[0_0_8px_rgba(255,46,84,0.2)]",
        outline:
          "border-border bg-card/60 text-foreground",
        ghost:
          "border-transparent hover:bg-muted hover:text-foreground",
        link: "border-transparent text-[var(--primary)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
