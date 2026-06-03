"use client"

import { FormEvent, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ChatMessage = {
  id: number
  role: "user" | "assistant"
  content: string
}

const MOCK_ASSISTANT_RESPONSE =
  "Tính năng AI sẽ được kết nối ở phiên bản tiếp theo."

export function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedInput = input.trim()

    if (!trimmedInput) {
      return
    }

    const timestamp = Date.now()

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: timestamp,
        role: "user",
        content: trimmedInput,
      },
      {
        id: timestamp + 1,
        role: "assistant",
        content: MOCK_ASSISTANT_RESPONSE,
      },
    ])
    setInput("")
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <Card className="w-[calc(100vw-2rem)] max-w-sm border-primary/20 shadow-2xl shadow-primary/10 sm:w-96">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Trợ lý AI</CardTitle>
                <CardDescription>
                  Hỏi về chi tiêu, lịch học, todo và kế hoạch của bạn.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Đóng trợ lý AI"
                onClick={() => setOpen(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex max-h-72 min-h-48 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/40 p-3">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-40 items-center justify-center text-center text-sm text-muted-foreground">
                  Nhập câu hỏi để bắt đầu trò chuyện với trợ lý AI.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-background text-foreground ring-1 ring-border"
                    )}
                  >
                    {message.content}
                  </div>
                ))
              )}
            </div>
          </CardContent>

          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Nhập câu hỏi..."
                aria-label="Nội dung tin nhắn"
              />
              <Button type="submit">Gửi</Button>
            </form>
          </CardFooter>
        </Card>
      ) : null}

      <Button
        type="button"
        size="icon-lg"
        className="size-14 rounded-full border border-sky-300/25 bg-gradient-to-br from-sky-300 via-sky-400 to-red-300 text-base font-bold text-slate-950 shadow-xl shadow-sky-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200/50 hover:shadow-2xl hover:shadow-sky-400/25 focus-visible:border-sky-100 focus-visible:ring-4 focus-visible:ring-sky-300/25 active:translate-y-0"
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        AI
      </Button>
    </div>
  )
}