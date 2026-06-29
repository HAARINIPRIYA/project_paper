import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full aria-[orientation=vertical]:flex-col", className)}
      {...props} />
  );
}

function ResizablePanel({
  ...props
}) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "group relative flex w-[5px] shrink-0 items-center justify-center bg-transparent ring-offset-background transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-[13px] after:-translate-x-1/2 after:cursor-col-resize hover:bg-accent/50 focus-visible:outline-hidden data-[resize-handle-active]:bg-accent/70 aria-[orientation=horizontal]:h-[5px] aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-[13px] aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:cursor-row-resize [&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}>
      <div className={cn(
        "pointer-events-none z-10 h-8 w-[3px] shrink-0 rounded-full bg-border transition-all duration-150",
        "group-hover:h-10 group-hover:w-[4px] group-hover:bg-foreground/20",
        "group-data-[resize-handle-active]:h-10 group-data-[resize-handle-active]:w-[4px] group-data-[resize-handle-active]:bg-foreground/30"
      )} />
      {withHandle && (
        <div className="pointer-events-none absolute z-20 flex h-10 w-[18px] items-center justify-center rounded-full bg-border/50 opacity-0 transition-all duration-150 group-hover:opacity-100 group-data-active:opacity-100 group-hover:bg-foreground/10">
          <div className="pointer-events-none flex flex-col gap-[3px]">
            <div className="h-[3px] w-[3px] rounded-full bg-foreground/30" />
            <div className="h-[3px] w-[3px] rounded-full bg-foreground/30" />
            <div className="h-[3px] w-[3px] rounded-full bg-foreground/30" />
          </div>
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
