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

type ChatModeId = "data" | "schedule" | "suggestion"

type ChatMode = {
  id: ChatModeId
  label: string
  placeholder: string
  intro: string
  response: string
}

const CHAT_MODES: ChatMode[] = [
  {
    id: "data",
    label: "Hỏi dữ liệu",
    placeholder: "Ví dụ: Tháng này tôi tiêu nhiều nhất vào đâu?",
    intro:
      "Bạn đang ở chế độ Hỏi dữ liệu. Mình sẽ dùng nơi này để trả lời các câu hỏi về thu chi, todo và lịch của bạn.",
    response:
      "Mình sẽ sớm trả lời dựa trên dữ liệu thu chi, todo và lịch của bạn.",
  },
  {
    id: "schedule",
    label: "Tạo việc/lịch",
    placeholder: "Ví dụ: Tạo lịch học AI tối nay lúc 8h",
    intro:
      "Bạn đang ở chế độ Tạo việc/lịch. Sau này mình sẽ giúp biến câu tự nhiên thành todo hoặc khối thời gian.",
    response:
      "Mình sẽ sớm hỗ trợ tạo todo và khối thời gian từ câu tự nhiên.",
  },
  {
    id: "suggestion",
    label: "Gợi ý cá nhân",
    placeholder: "Ví dụ: Tuần này tôi nên cải thiện gì?",
    intro:
      "Bạn đang ở chế độ Gợi ý cá nhân. Mình sẽ là nơi tổng hợp tín hiệu để đưa ra gợi ý phù hợp với bạn.",
    response: "Mình sẽ sớm phân tích dữ liệu và đưa ra gợi ý cá nhân.",
  },
]

const DEFAULT_PLACEHOLDER = "Chọn một chế độ hoặc nhập câu hỏi..."

export function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [selectedMode, setSelectedMode] = useState<ChatModeId | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const activeMode = CHAT_MODES.find((mode) => mode.id === selectedMode)

  function handleSelectMode(mode: ChatMode) {
    setSelectedMode(mode.id)
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        role: "assistant",
        content: mode.intro,
      },
    ])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedInput = input.trim()

    if (!trimmedInput || loading) {
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
    ])
    setInput("")

    if (selectedMode !== "data") {
      const response =
        activeMode?.response ??
        "Hãy chọn một chế độ để mình phản hồi đúng ngữ cảnh hơn nhé."

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: timestamp + 1,
          role: "assistant",
          content: response,
        },
      ])
      return
    }

    const loadingMessageId = timestamp + 1
    setLoading(true)
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: loadingMessageId,
        role: "assistant",
        content: "Đang suy nghĩ...",
      },
    ])

    try {
      const response = await fetch("/api/ai/chat-data-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput }),
      })
      const data = (await response.json()) as { ok?: boolean; reply?: string }
      const reply =
        data.reply ||
        "Mình chưa nhận được phản hồi phù hợp. Bạn thử hỏi lại ngắn gọn hơn nhé."

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === loadingMessageId ? { ...message, content: reply } : message
        )
      )
    } catch {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === loadingMessageId
            ? {
                ...message,
                content: "Mình chưa kết nối được với trợ lý AI. Bạn thử lại sau nhé.",
              }
            : message
        )
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <Card className="w-[calc(100vw-2rem)] overflow-hidden border-sky-300/15 bg-slate-950/95 text-slate-50 shadow-2xl shadow-sky-950/40 backdrop-blur-xl sm:w-[400px]">
          <CardHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg text-slate-50">Trợ lý AI</CardTitle>
                <CardDescription className="text-slate-300">
                  Hỏi dữ liệu, tạo lịch và nhận gợi ý cá nhân.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Đóng trợ lý AI"
                className="text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-sky-300/30"
                onClick={() => setOpen(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 bg-slate-950 p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CHAT_MODES.map((mode) => (
                <Button
                  key={mode.id}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-auto justify-start whitespace-normal rounded-2xl border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold text-slate-200 transition-all hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-sky-300/10 hover:text-sky-50 focus-visible:ring-sky-300/30",
                    selectedMode === mode.id &&
                      "border-sky-300/60 bg-sky-300/15 text-sky-50 shadow-lg shadow-sky-950/30"
                  )}
                  onClick={() => handleSelectMode(mode)}
                >
                  {mode.label}
                </Button>
              ))}
            </div>

            <div className="flex max-h-72 min-h-48 flex-col gap-3 overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/70 p-3 shadow-inner shadow-black/20">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-40 items-center justify-center px-4 text-center text-sm text-slate-400">
                  Chọn một chế độ nhanh để bắt đầu với trợ lý AI.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      message.role === "user"
                        ? "ml-auto bg-sky-300 text-slate-950 shadow-lg shadow-sky-950/20"
                        : "mr-auto bg-white/[0.06] text-slate-100 ring-1 ring-white/10"
                    )}
                  >
                    {message.content}
                  </div>
                ))
              )}
            </div>
          </CardContent>

          <CardFooter className="border-t border-white/10 bg-slate-950 p-4">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={activeMode?.placeholder ?? DEFAULT_PLACEHOLDER}
                aria-label="Nội dung tin nhắn"
                disabled={loading}
                className="border-white/10 bg-white/[0.04] text-slate-50 placeholder:text-slate-500 focus-visible:ring-sky-300/30"
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-sky-300 text-slate-950 hover:bg-sky-200 focus-visible:ring-sky-300/30"
              >
                {loading ? "Đợi..." : "Gửi"}
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : null}

      <Button
        type="button"
        size="icon-lg"
        className="size-14 rounded-full border border-sky-300/30 bg-gradient-to-br from-sky-200 via-sky-400 to-amber-200 text-base font-black tracking-tight text-slate-950 shadow-xl shadow-sky-500/25 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:border-sky-100/70 hover:shadow-2xl hover:shadow-sky-400/30 focus-visible:border-sky-100 focus-visible:ring-4 focus-visible:ring-sky-300/30 active:translate-y-0 active:scale-100"
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        AI
      </Button>
    </div>
  )
}