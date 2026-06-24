import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
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
import { cn } from "@/lib/utils"
import GPSForm from "./components/GPSForm"
import UploadZone from "./components/UploadZone"

function Dashboard({ uploadedImage, onImageUpload, gpsData, onGPSSubmit }) {
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
      <div className="grid h-full grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_360px]">
        <aside className="hidden h-full flex-col border-r bg-background/70 backdrop-blur md:flex">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
                  <span className="font-serif text-[15px] leading-none">CS</span>
                </div>
                <div className="leading-tight">
                  <div className="font-medium tracking-tight">CaneSense</div>
                  <div className="text-xs text-muted-foreground">Assistant</div>
                </div>
              </div>
              <Button size="icon-sm" variant="ghost" aria-label="New chat" onClick={() => setActiveChatId("new")}>
                <Plus />
              </Button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search chats" />
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1">
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
          </ScrollArea>

          <div className="p-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-muted text-xs">U</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">You</div>
                  <div className="truncate text-xs text-muted-foreground">CaneSense workspace</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="flex h-full min-w-0 flex-col">
          <div className="flex items-center justify-between gap-3 border-b bg-background/70 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium tracking-tight">CaneSense Analysis</div>
              <div className="truncate text-xs text-muted-foreground">
                Ask questions, upload a billet image, and set field context.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
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

              <Button variant="outline" size="icon-sm" aria-label="Attach">
                <Paperclip />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
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
                        "max-w-[680px] rounded-xl px-4 py-3 text-sm leading-relaxed",
                        isUser
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-card text-card-foreground border shadow-sm"
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
          </ScrollArea>

          <div className="border-t bg-background/70 backdrop-blur">
            <div className="mx-auto w-full max-w-[820px] px-4 py-4">
              <div className="rounded-xl border bg-card p-2 shadow-sm">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="Message CaneSense…"
                    className="min-h-[44px] resize-none border-0 bg-transparent px-3 py-2 shadow-none focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        onSend()
                      }
                    }}
                  />
                  <Button size="icon" aria-label="Send" onClick={onSend}>
                    <Send />
                  </Button>
                </div>
                <div className="mt-1 flex items-center justify-between px-3 pb-1">
                  <div className="text-xs text-muted-foreground">
                    Shift + Enter for a new line
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadedImage ? <Badge variant="secondary">Image ready</Badge> : null}
                    {gpsData ? <Badge variant="secondary">Field ready</Badge> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden h-full flex-col border-l bg-background/70 p-4 backdrop-blur lg:flex">
          <Card className="flex-1 overflow-hidden">
            <CardContent className="h-full p-4">{toolPanel}</CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default Dashboard
