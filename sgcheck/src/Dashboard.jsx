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
        "Hi — I'm CaneSense. Upload a billet image and add field coordinates to start a growth-quality analysis.",
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

      <Tabs defaultValue="image">
        <TabsList className="w-full justify-start" style={{ width: "100%", justifyContent: "flex-start" }}>
          <TabsTrigger value="image" style={{ flex: "1 1 0%" }}>Billet Image</TabsTrigger>
          <TabsTrigger value="field" style={{ flex: "1 1 0%" }}>Field Details</TabsTrigger>
        </TabsList>
        <TabsContent value="image" style={{ marginTop: "1rem" }}>
          <UploadZone onImageUpload={onImageUpload} uploadedImage={uploadedImage} />
        </TabsContent>
        <TabsContent value="field" style={{ marginTop: "1rem" }}>
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
          "Got it. If you haven't yet, add an image and field details in the Tools panel so I can contextualize the analysis.",
      },
    ])
    setComposer("")
  }

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="horizontal" className="hidden md:flex">
        <ResizablePanel defaultSize={20} minSize={6} maxSize={30}>
          <aside className="sidebar" style={{ overflow: "hidden" }}>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="sidebar-brand">
                  <div className="sidebar-logo">
                    <span>CS</span>
                  </div>
                  <div className="leading-tight">
                    <div className="sidebar-name">CaneSense</div>
                    <div className="sidebar-subtitle">Workspace</div>
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
                  className={"sidebar-nav-btn" + (view === "dashboard" ? " active" : "")}
                >
                  <LayoutDashboard />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setView("analysis")}
                  className={"sidebar-nav-btn" + (view === "analysis" ? " active" : "")}
                >
                  <MessageSquareText />
                  Analysis
                </button>
              </div>
            </div>

            <div className="sidebar-search-wrap">
              <Search className="sidebar-search-icon" />
              <Input className="pl-9" placeholder={view === "analysis" ? "Search chats" : "Search"} />
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
                      className={"chat-item" + (activeChatId === c.id ? " active" : "")}
                    >
                      <div className="chat-item-title">{c.title}</div>
                      <div className="chat-item-subtitle">{c.subtitle}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Use the Dashboard to review signals, then switch back to Analysis to chat.
                </div>
              )}
            </ScrollArea>

            <div className="sidebar-user">
              <div className="sidebar-user-inner">
                <Avatar size="sm">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium leading-tight">You</div>
                  <div className="truncate sidebar-subtitle">CaneSense workspace</div>
                </div>
              </div>
            </div>
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={56} minSize={15}>
          <main className="flex h-full min-w-0 flex-col">
            <div className="main-header">
              <div className="min-w-0">
                <div className="main-header-title">
                  {view === "analysis" ? "CaneSense" : "Dashboard"}
                </div>
                <div className="main-header-subtitle">
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
                  {uploadedImage ? <span className="status-dot ready" title="Image ready" /> : null}
                  {gpsData ? <span className="status-dot ready" title="Field data ready" /> : null}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {view === "analysis" ? (
                <div style={{ margin: "0 auto", maxWidth: "720px", display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem 1rem" }}>
                  {messages.map((m, idx) => {
                    const isUser = m.role === "user"
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(0.02 * idx, 0.18) }}
                        className={"message-row" + (isUser ? " user" : " assistant")}
                      >
                        {!isUser ? (
                          <Avatar>
                            <AvatarFallback style={{ background: "var(--fg)", color: "var(--bg)" }}>CS</AvatarFallback>
                          </Avatar>
                        ) : null}

                        <div className={"message-bubble" + (isUser ? " user" : " assistant")}>
                          {m.content}
                        </div>

                        {isUser ? (
                          <Avatar>
                            <AvatarFallback>U</AvatarFallback>
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
              <div className="composer-wrap">
                <div className="composer-inner">
                  <div className="composer-box">
                    <div className="composer-flex">
                      <div className="composer-input-wrap">
                        <Textarea
                          value={composer}
                          onChange={(e) => setComposer(e.target.value)}
                          placeholder="Message CaneSense…"
                          style={{ minHeight: "40px", border: "none", background: "transparent", padding: "0.625rem 0.75rem", fontSize: "0.875rem", boxShadow: "none" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              onSend()
                            }
                          }}
                        />
                      </div>
                      <Button size="icon" aria-label="Send" onClick={onSend} style={{ marginBottom: "3px" }}>
                        <Send />
                      </Button>
                    </div>
                    <div className="composer-footer">
                      <div className="composer-hint">Shift + Enter for a new line</div>
                      <div className="composer-status">
                        {uploadedImage ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Image ready</Badge> : null}
                        {gpsData ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Field ready</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={24} minSize={6} maxSize={45}>
          <aside className="flex h-full flex-col border-l" style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
            <div className="tools-panel">
              <div className="tools-scroll">
                <div className="tools-card">
                  {toolPanel}
                </div>
              </div>
            </div>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="flex h-full flex-col md:hidden">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)", backdropFilter: "blur(8px)" }}>
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
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="nav-btn-grid">
                    <Button
                      type="button"
                      variant={view === "dashboard" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setView("dashboard")}
                    >
                      <LayoutDashboard />
                      Dashboard
                    </Button>
                    <Button
                      type="button"
                      variant={view === "analysis" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setView("analysis")}
                    >
                      <MessageSquareText />
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
                          className={"chat-item" + (activeChatId === c.id ? " active" : "")}
                        >
                          <div className="chat-item-title">{c.title}</div>
                          <div className="chat-item-subtitle">{c.subtitle}</div>
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
                  <SlidersHorizontal />
                  Tools
                </Button>
              </SheetTrigger>
              <SheetContent side="right" style={{ width: "360px" }} className="sm:w-[420px]">
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem 1rem" }}>
              {messages.map((m, idx) => {
                const isUser = m.role === "user"
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(0.02 * idx, 0.18) }}
                    className={"message-row" + (isUser ? " user" : " assistant")}
                  >
                    {!isUser ? (
                      <Avatar>
                        <AvatarFallback style={{ background: "linear-gradient(to bottom right, var(--color-emerald-600), var(--color-emerald-700))", color: "#fff" }}>CS</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div className={"message-bubble" + (isUser ? " user" : " assistant")} style={{ maxWidth: "min(85%, 480px)" }}>
                      {m.content}
                    </div>

                    {isUser ? (
                      <Avatar size="sm">
                        <AvatarFallback>U</AvatarFallback>
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
          <div className="composer-wrap">
            <div className="px-4 py-3">
              <div className="composer-box">
                <div className="composer-flex">
                  <div className="composer-input-wrap">
                    <Textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      placeholder="Message CaneSense…"
                      style={{ minHeight: "40px", border: "none", background: "transparent", padding: "0.625rem 0.75rem", fontSize: "0.875rem", boxShadow: "none" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          onSend()
                        }
                      }}
                    />
                  </div>
                  <Button size="icon" aria-label="Send" onClick={onSend} style={{ marginBottom: "3px" }}>
                    <Send />
                  </Button>
                </div>
                <div className="composer-footer">
                  <div className="composer-hint">Shift + Enter for a new line</div>
                  <div className="composer-status">
                    {uploadedImage ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Image ready</Badge> : null}
                    {gpsData ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Field ready</Badge> : null}
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
