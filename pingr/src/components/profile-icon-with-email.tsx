'use client'

import { User } from 'lucide-react'

export function ProfileIconWithEmail({ email }: { email: string }) {
  return (
    <div className="group relative inline-flex">
      <span
        className="flex size-9 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Signed in as ${email}`}
      >
        <User className="size-4" />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {email}
      </span>
    </div>
  )
}
