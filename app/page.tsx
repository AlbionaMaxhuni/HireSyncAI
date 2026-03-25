'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  LogOut,
  Send,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react'

type Conversation = {
  id: string
  user_id: string
  title: string
  created_at: string
}

type Message = {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  )

  // Client check (middleware already blocks, this is just extra safety)
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login?message=auth_required')
        return
      }
      setUserId(data.user.id)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load conversations when userId ready
  useEffect(() => {
    if (!userId) return

    const load = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      const list = (data ?? []) as Conversation[]
      setConversations(list)

      // auto select newest conversation (optional)
      if (!activeConversationId && list.length > 0) {
        setActiveConversationId(list[0].id)
      }
    }

    load()
  }, [userId, activeConversationId, supabase])

  // Load messages when selecting a conversation
  useEffect(() => {
    if (!userId || !activeConversationId) {
      setMessages([])
      return
    }

    const load = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      setMessages((data ?? []) as Message[])
    }

    load()
  }, [userId, activeConversationId, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login?method=logout')
  }

  const createNewConversation = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('conversations')
      .insert([{ user_id: userId, title: 'New conversation' }])
      .select('*')
      .single()

    if (error) {
      console.error(error)
      return
    }

    const conv = data as Conversation
    setConversations((prev) => [conv, ...prev])
    setActiveConversationId(conv.id)
    setMessages([])
  }

  const deleteConversation = async (conversationId: string) => {
    if (!userId) return
    // delete conversation -> cascades messages (on delete cascade)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId)
      .eq('id', conversationId)

    if (error) {
      console.error(error)
      return
    }

    setConversations((prev) => prev.filter((c) => c.id !== conversationId))
    if (activeConversationId === conversationId) {
      setActiveConversationId(null)
      setMessages([])
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !userId) return

    setIsSending(true)

    try {
      let convId = activeConversationId

      // If no conversation selected, create one first
      if (!convId) {
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert([{ user_id: userId, title: input.trim().slice(0, 40) }])
          .select('*')
          .single()

        if (convError) throw convError
        convId = (conv as Conversation).id
        setConversations((prev) => [conv as Conversation, ...prev])
        setActiveConversationId(convId)
      }

      const prompt = input.trim()
      setInput('')

      // 1) Insert user message
      const { data: insertedUserMsg, error: insertUserError } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: convId,
            user_id: userId,
            role: 'user',
            content: prompt,
          },
        ])
        .select('*')
        .single()

      if (insertUserError) throw insertUserError

      setMessages((prev) => [...prev, insertedUserMsg as Message])

      // 2) Call AI API
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: prompt }), // matches your route.ts expecting { title }
      })

      const aiData = await res.json()
      if (!res.ok) {
        throw new Error(aiData?.error ?? 'AI request failed')
      }

      const assistantText = String(aiData?.questions ?? '').trim()

      // 3) Insert assistant message
      const { data: insertedAssistantMsg, error: insertAssistantError } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: convId,
            user_id: userId,
            role: 'assistant',
            content: assistantText,
          },
        ])
        .select('*')
        .single()

      if (insertAssistantError) throw insertAssistantError

      setMessages((prev) => [...prev, insertedAssistantMsg as Message])

      // Optional: update conversation title if still default
      if (activeConversation?.title === 'New conversation') {
        await supabase
          .from('conversations')
          .update({ title: prompt.slice(0, 50) })
          .eq('user_id', userId)
          .eq('id', convId)

        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: prompt.slice(0, 50) } : c))
        )
      }
    } catch (err) {
      console.error(err)
      // optional: show toast
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Sparkles size={18} />
            </div>
            <div className="font-black tracking-tight">
              HireSync<span className="text-blue-600">AI</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[320px_1fr]">
        {/* Sidebar: conversations */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              Conversations
            </div>
            <button
              onClick={createNewConversation}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-600"
            >
              <Plus size={14} />
              New
            </button>
          </div>

          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No conversations yet. Create one and start asking.
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === activeConversationId
                return (
                  <div
                    key={c.id}
                    className={[
                      'group flex items-center justify-between gap-2 rounded-2xl border p-3 transition',
                      isActive
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-100 bg-white hover:border-slate-200',
                    ].join(' ')}
                  >
                    <button
                      onClick={() => setActiveConversationId(c.id)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <MessageSquare size={16} className="mt-0.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">
                          {c.title}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {new Date(c.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => deleteConversation(c.id)}
                      className="rounded-xl p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      title="Delete"
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Main: chat */}
        <main className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
              {activeConversation ? 'Chat' : 'Start'}
            </div>
            <div className="mt-1 text-xl font-black tracking-tight">
              {activeConversation?.title ?? 'Ask a role to generate interview questions'}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3 pb-28">
            {messages.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Write a role title (e.g. “Frontend Developer”) and I will generate 5 interview
                questions. Your history will be saved automatically.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={[
                    'rounded-2xl border p-4 text-sm leading-relaxed',
                    m.role === 'assistant'
                      ? 'border-blue-100 bg-blue-50/40'
                      : 'border-slate-100 bg-white',
                  ].join(' ')}
                >
                  <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {m.role}
                  </div>
                  <div className="whitespace-pre-wrap text-slate-800">{m.content}</div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="sticky bottom-0 mt-4 border-t border-slate-100 bg-white pt-4">
            <form onSubmit={sendMessage} className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pozita (p.sh. Frontend Developer)"
                className="w-full rounded-full border-2 border-slate-100 bg-white px-5 py-4 pr-14 text-sm font-semibold outline-none transition focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-blue-600 disabled:opacity-30"
                aria-label="Send"
                title="Send"
              >
                {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}