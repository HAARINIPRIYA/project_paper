import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full", className)}
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
      className={cn("resize-handle", className)}
      {...props}>
      <div className="resize-handle-bar" />
      {withHandle && (
        <div className="resize-handle-grip">
          <div className="resize-handle-dots">
            <div className="resize-handle-dot" />
            <div className="resize-handle-dot" />
            <div className="resize-handle-dot" />
          </div>
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
