'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const STEPS = [
  {
    step: 1,
    instruction: (
      <>
        Click <strong>Download Extension</strong> below and unzip the downloaded
        file.
      </>
    ),
  },
  {
    step: 2,
    instruction: (
      <>
        Open Chrome and navigate to{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
          chrome://extensions
        </code>
        .
      </>
    ),
  },
  {
    step: 3,
    instruction: (
      <>
        Enable <strong>Developer mode</strong> using the toggle in the top-right
        corner.
      </>
    ),
  },
  {
    step: 4,
    instruction: (
      <>
        Click <strong>Load unpacked</strong> and select the unzipped folder.
      </>
    ),
  },
  {
    step: 5,
    instruction: (
      <>
        Done — the Pingr icon will appear in your Chrome toolbar. Click it to
        open the side panel on any LinkedIn profile.
      </>
    ),
  },
]

export function ExtensionInstallModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-serif">
          Get the Extension
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">
            Install Pingr for Chrome
          </DialogTitle>
        </DialogHeader>

        <ol className="mt-2 flex flex-col gap-4">
          {STEPS.map(({ step, instruction }) => (
            <li key={step} className="flex gap-3.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                {step}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {instruction}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-2 border-t pt-4">
          <a href="/pingr-extension.zip" download>
            <Button className="w-full font-serif">Download Extension</Button>
          </a>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Chrome only &middot; No Chrome Web Store required
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
