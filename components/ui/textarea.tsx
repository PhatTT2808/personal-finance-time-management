import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-base text-slate-100 transition-colors outline-none placeholder:text-slate-500 focus-visible:border-sky-300/50 focus-visible:ring-3 focus-visible:ring-sky-300/20 disabled:cursor-not-allowed disabled:bg-white/5 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
