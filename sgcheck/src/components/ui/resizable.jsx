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
  style,
  ...props
}) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" style={{ minWidth: 0, ...style }} {...props} />;
}

function ResizableHandle({
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn("resize-handle", className)}
      {...props} />
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
