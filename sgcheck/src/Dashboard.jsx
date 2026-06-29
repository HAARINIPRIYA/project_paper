import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Paperclip,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { cn } from "@/lib/utils"
import GPSForm from "./components/GPSForm"
import UploadZone from "./components/UploadZone"
import DashboardPage from "./pages/DashboardPage"

function Dashboard({ uploadedImage, onImageUpload, gpsData, onGPSSubmit }) {
  const [view, setView] = useState("analysis")
  const [activeChatId, setActiveChatId] = useState("new")
  const [composer, setComposer] = useState("")
  const [messages, setMessages] = useState(() => [
    {
      id: "m1",
      role: "assistant",
      content:
        "Hi — I’m CaneSense. Upload a billet image and add field coordinates to start a growth-quality analysis.",
    },
  ])

  const chats = useMemo(
    () => [
      { id: "new", title: "New analysis", subtitle: "Billet + field details" },
      { id: "c1", title: "Field A-12", subtitle: "Last run: 2 days ago" },
      { id: "c2", title: "Seed batch 07", subtitle: "Quality check notes" },
    ],
    []
  )

  const toolPanel = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium tracking-tight">Analysis Setup</div>
          <div className="text-xs text-muted-foreground">
            Provide inputs to run a higher-confidence result.
          </div>
        </div>
        <Badge variant="secondary">Tools</Badge>
      </div>

      <Tabs defaultValue="image" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="image">Billet Image</TabsTrigger>
          <TabsTrigger value="field">Field Details</TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="mt-4">
          <UploadZone onImageUpload={onImageUpload} uploadedImage={uploadedImage} />
        </TabsContent>
        <TabsContent value="field" className="mt-4">
          <GPSForm onSubmit={onGPSSubmit} gpsData={gpsData} />
        </TabsContent>
      </Tabs>
    </div>
  )

  const onSend = () => {
    const text = composer.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-u`, role: "user", content: text },
      {
        id: `${Date.now()}-a`,
        role: "assistant",
        content:
          "Got it. If you haven’t yet, add an image and field details in the Tools panel so I can contextualize the analysis.",
      },
    ])
    setComposer("")
  }

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal" className="hidden md:flex">
        <ResizablePanel defaultSize={20} minSize={8} maxSize={30}>
          <aside className="flex h-full flex-col border-r bg-background/70 backdrop-blur">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xs">
                    <span className="text-[13px] font-semibold leading-none tracking-tight">CS</span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold tracking-tight">CaneSense</div>
                    <div className="text-[11px] text-muted-foreground">Workspace</div>
                  </div>
                </div>
                {view === "analysis" ? (
                  <Button size="icon-sm" variant="ghost" aria-label="New chat" onClick={() => setActiveChatId("new")}>
                    <Plus />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all ${
                    view === "dashboard"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <LayoutDashboard className="size-4 shrink-0" />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setView("analysis")}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all ${
                    view === "analysis"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <MessageSquareText className="size-4 shrink-0" />
                  Analysis
                </button>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder={view === "analysis" ? "Search chats" : "Search"} />
              </div>
            </div>

            <Separator />

            <ScrollArea className="flex-1">
              {view === "analysis" ? (
                <div className="flex flex-col gap-1 p-2">
                  {chats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveChatId(c.id)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-left transition-colors",
                        "hover:bg-muted/70",
                        activeChatId === c.id && "bg-muted"
                      )}
                    >
                      <div className="text-sm font-medium leading-tight">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.subtitle}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Use the Dashboard to review signals, then switch back to Analysis to chat.
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-3">
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">U</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium leading-tight">You</div>
                  <div className="truncate text-[11px] text-muted-foreground">CaneSense workspace</div>
                </div>
              </div>
            </div>
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={56} minSize={20}>
          <main className="flex h-full min-w-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b bg-background/70 px-4 py-3 backdrop-blur">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium tracking-tight">
                  {view === "analysis" ? "CaneSense" : "Dashboard"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {view === "analysis"
                    ? "Ask questions, upload a billet image, and set field context."
                    : "Metrics and session overview."}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" aria-label="Attach">
                  <Paperclip />
                </Button>
                <div className="flex items-center gap-1.5">
                  {uploadedImage ? <span className="size-1.5 rounded-full bg-emerald-400" title="Image ready" /> : null}
                  {gpsData ? <span className="size-1.5 rounded-full bg-emerald-400" title="Field data ready" /> : null}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {view === "analysis" ? (
                <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 px-4 py-6">
                  {messages.map((m, idx) => {
                    const isUser = m.role === "user"
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(0.02 * idx, 0.18) }}
                        className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
                      >
                        {!isUser ? (
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-foreground text-background text-xs">CS</AvatarFallback>
                          </Avatar>
                        ) : null}

                        <div
                          className={cn(
                            "max-w-[min(90%,620px)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            isUser
                              ? "bg-primary/[0.08] text-foreground"
                              : "bg-card text-card-foreground border shadow-xs"
                          )}
                        >
                          {m.content}
                        </div>

                        {isUser ? (
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-muted text-xs">U</AvatarFallback>
                          </Avatar>
                        ) : null}
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="mx-auto w-full px-4 py-6">
                  <DashboardPage uploadedImage={uploadedImage} gpsData={gpsData} />
                </div>
              )}
            </ScrollArea>

            {view === "analysis" ? (
              <div className="border-t bg-background/70 backdrop-blur">
                <div className="mx-auto w-full max-w-[720px] px-4 py-3">
                  <div className="rounded-2xl border bg-card p-1.5 shadow-xs">
                    <div className="flex items-end gap-1.5">
                      <div className="flex-1">
                        <Textarea
                          value={composer}
                          onChange={(e) => setComposer(e.target.value)}
                          placeholder="Message CaneSense…"
                          className="min-h-[40px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none focus-visible:ring-0"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              onSend()
                            }
                          }}
                        />
                      </div>
                      <Button size="icon" aria-label="Send" onClick={onSend} className="mb-[3px]">
                        <Send />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between px-3 pb-1.5">
                      <div className="text-[11px] text-muted-foreground/60">Shift + Enter for a new line</div>
                      <div className="flex items-center gap-1.5">
                        {uploadedImage ? <Badge variant="secondary" className="text-[10px] h-4">Image ready</Badge> : null}
                        {gpsData ? <Badge variant="secondary" className="text-[10px] h-4">Field ready</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={24} minSize={12} maxSize={45}>
          <aside className="flex h-full flex-col border-l bg-background/70 backdrop-blur">
            <div className="flex h-full min-w-0 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
                  {toolPanel}
                </div>
              </div>
            </div>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="flex h-full flex-col md:hidden">
        <div className="flex items-center justify-between gap-3 border-b bg-background/70 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium tracking-tight">
              {view === "analysis" ? "CaneSense" : "Dashboard"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {view === "analysis" ? "Chat + field tools" : "Metrics overview"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={view === "dashboard" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setView("dashboard")}
                    >
                      <LayoutDashboard data-icon="inline-start" />
                      Dashboard
                    </Button>
                    <Button
                      type="button"
                      variant={view === "analysis" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setView("analysis")}
                    >
                      <MessageSquareText data-icon="inline-start" />
                      Analysis
                    </Button>
                  </div>
                  <Separator />
                  {view === "analysis" ? (
                    <div className="flex flex-col gap-1">
                      {chats.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveChatId(c.id)}
                          className={cn(
                            "rounded-lg px-3 py-2 text-left transition-colors",
                            "hover:bg-muted/70",
                            activeChatId === c.id && "bg-muted"
                          )}
                        >
                          <div className="text-sm font-medium leading-tight">{c.title}</div>
                          <div className="text-xs text-muted-foreground">{c.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Switch to Analysis to see chats.
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal data-icon="inline-start" />
                  Tools
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[360px] sm:w-[420px]">
                <SheetHeader>
                  <SheetTitle>Tools</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{toolPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {view === "analysis" ? (
            <div className="mx-auto flex w-full flex-col gap-3 px-4 py-6">
              {messages.map((m, idx) => {
                const isUser = m.role === "user"
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(0.02 * idx, 0.18) }}
                    className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
                  >
                    {!isUser ? (
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-[10px]">CS</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div
                      className={cn(
                        "max-w-[min(85%,480px)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isUser
                          ? "bg-primary/[0.08] text-foreground"
                          : "bg-card text-card-foreground border shadow-xs"
                      )}
                    >
                      {m.content}
                    </div>

                    {isUser ? (
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">U</AvatarFallback>
                      </Avatar>
                    ) : null}
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="mx-auto w-full px-4 py-6">
              <DashboardPage uploadedImage={uploadedImage} gpsData={gpsData} />
            </div>
          )}
        </ScrollArea>

        {view === "analysis" ? (
          <div className="border-t bg-background/70 backdrop-blur">
            <div className="mx-auto w-full px-4 py-3">
              <div className="rounded-2xl border bg-card p-1.5 shadow-xs">
                <div className="flex items-end gap-1.5">
                  <div className="flex-1">
                    <Textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      placeholder="Message CaneSense…"
                      className="min-h-[40px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none focus-visible:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          onSend()
                        }
                      }}
                    />
                  </div>
                  <Button size="icon" aria-label="Send" onClick={onSend} className="mb-[3px]">
                    <Send />
                  </Button>
                </div>
                <div className="flex items-center justify-between px-3 pb-1.5">
                  <div className="text-[11px] text-muted-foreground/60">Shift + Enter for a new line</div>
                  <div className="flex items-center gap-1.5">
                    {uploadedImage ? <Badge variant="secondary" className="text-[10px] h-4">Image ready</Badge> : null}
                    {gpsData ? <Badge variant="secondary" className="text-[10px] h-4">Field ready</Badge> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Dashboard
