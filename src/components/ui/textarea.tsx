import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-sm border border-input bg-[var(--surface-sunken)] px-3 py-2 font-mono text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground/60 focus-visible:border-[var(--brand)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]/50 disabled:cursor-not-allowed disabled:bg-input/30 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
