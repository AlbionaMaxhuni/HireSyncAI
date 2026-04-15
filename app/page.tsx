'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Plus,
  Trash2,
  Send,
  Loader2,
  MessageSquareText,
  Clock,
  Clipboard,
  Check,
  Pencil,
  X,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import Card from '@/components/ui/Card'
import Toast, { type ToastState } from '@/components/ui/Toast'
import Skeleton from '@/components/ui/Skeleton'

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="p-5">
      <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div>
    </Card>
  )
}

function MobileTabs({
  tab,
  setTab,
}: {
  tab: 'chat' | 'history'
  setTab: (t: 'chat' | 'history') => void
}) {
  return (
    <div className="md:hidden">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <button
          onClick={() => setTab('chat')}
          className={[
            'rounded-xl px-3 py-2 text-sm font-black transition',
            tab === 'chat' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('history')}
          className={[
            'rounded-xl px-3 py-2 text-sm font-black transition',
            tab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          History
        </button>
      </div>
    </div>
  )
}

/**
 * OpenRouter streaming returns SSE:
 * data: { ...json... }\n\n
 * data: [DONE]\n\n
 *
 * We extract text deltas from choices[0].delta.content (OpenAI-compatible).
 */
function extractOpenRouterTextFromSSEChunk(sseChunk: string) {
  const lines = sseChunk.split('\n')
  let out = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue

    const dataStr = trimmed.replace(/^data:\s?/, '')
    if (!dataStr || dataStr === '[DONE]') continue

    try {
      const json = JSON.parse(dataStr)
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string') out += delta
    } catch {
      // ignore partial JSON lines
    }
  }

  return out
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [toast, setToast] = useState<ToastState>({ open: false })
  const showToast = (type: 'success' | 'error', message: string) =>
    setToast({ open: true, type, message })

  const [tab, setTab] = useState<'chat' | 'history'>('chat')

  const [userId, setUserId] = useState<string | null>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')

  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const copyTimer = useRef<number | null>(null)

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  )

  // load user
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

  // load conversations
  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setLoadingConversations(true)
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        showToast('error', 'Failed to load conversations.')
        setLoadingConversations(false)
        return
      }

      const list = (data ?? []) as Conversation[]
      setConversations(list)

      if (!activeConversationId && list.length > 0) {
        setActiveConversationId(list[0].id)
      }

      setLoadingConversations(false)
    }

    load()
  }, [userId, activeConversationId, supabase])

  // load messages
  useEffect(() => {
    if (!userId || !activeConversationId) {
      setMessages([])
      return
    }

    const load = async () => {
      setLoadingMessages(true)

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error(error)
        showToast('error', 'Failed to load messages.')
        setLoadingMessages(false)
        return
      }

      setMessages((data ?? []) as Message[])
      setLoadingMessages(false)
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
      showToast('error', 'Could not create conversation.')
      return
    }

    const conv = data as Conversation
    setConversations((prev) => [conv, ...prev])
    setActiveConversationId(conv.id)
    setMessages([])
    setTab('chat')
    showToast('success', 'New conversation created.')
  }

  const deleteConversation = async (conversationId: string) => {
    if (!userId) return

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', userId)
      .eq('id', conversationId)

    if (error) {
      console.error(error)
      showToast('error', 'Could not delete conversation.')
      return
    }

    setConversations((prev) => prev.filter((c) => c.id !== conversationId))
    if (activeConversationId === conversationId) {
      setActiveConversationId(null)
      setMessages([])
    }

    showToast('success', 'Conversation deleted.')
  }

  const startRename = (c: Conversation) => {
    setEditingId(c.id)
    setEditingTitle(c.title)
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const saveRename = async () => {
    if (!userId || !editingId) return
    const title = editingTitle.trim()
    if (!title) {
      showToast('error', 'Title cannot be empty.')
      return
    }

    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('user_id', userId)
      .eq('id', editingId)

    if (error) {
      console.error(error)
      showToast('error', 'Could not rename conversation.')
      return
    }

    setConversations((prev) => prev.map((c) => (c.id === editingId ? { ...c, title } : c)))
    setEditingId(null)
    setEditingTitle('')
    showToast('success', 'Conversation renamed.')
  }

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMsgId(id)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedMsgId(null), 1500)
    } catch {
      showToast('error', 'Copy failed.')
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !userId) return

    setIsSending(true)

    try {
      let convId = activeConversationId
      const prompt = input.trim()
      setInput('')

      // create conversation if none
      if (!convId) {
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert([{ user_id: userId, title: prompt.slice(0, 50) }])
          .select('*')
          .single()

        if (convError) throw convError

        const created = conv as Conversation
        convId = created.id
        setConversations((prev) => [created, ...prev])
        setActiveConversationId(convId)
      }

      // insert user message
      const { data: userMsg, error: userMsgError } = await supabase
        .from('messages')
        .insert([
          { conversation_id: convId, user_id: userId, role: 'user', content: prompt },
        ])
        .select('*')
        .single()

      if (userMsgError) throw userMsgError
      setMessages((prev) => [...prev, userMsg as Message])

      // add temporary assistant message to stream into
      const tempId = `temp-${crypto.randomUUID()}`
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          conversation_id: convId!,
          user_id: userId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        } as Message,
      ])

      // call streaming API (OpenRouter SSE forwarded by route.ts)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: prompt }),
      })

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error ?? 'AI request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let fullText = ''
      let sseBuffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        // Append text chunk
        const chunkText = decoder.decode(value, { stream: true })
        sseBuffer += chunkText

        // Process complete SSE events separated by blank line
        const parts = sseBuffer.split('\n\n')
        sseBuffer = parts.pop() ?? '' // leftover

        for (const part of parts) {
          const deltaText = extractOpenRouterTextFromSSEChunk(part)
          if (!deltaText) continue
          fullText += deltaText

          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, content: fullText } : m))
          )
        }
      }

      fullText = fullText.trim()

      // persist assistant message
      const { data: assistantMsg, error: assistantMsgError } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: convId,
            user_id: userId,
            role: 'assistant',
            content: fullText,
          },
        ])
        .select('*')
        .single()

      if (assistantMsgError) throw assistantMsgError

      // replace temp with real
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (assistantMsg as Message) : m)))

      // auto-title if default
      const currentConv = conversations.find((c) => c.id === convId) ?? null
      if (currentConv?.title === 'New conversation') {
        await supabase
          .from('conversations')
          .update({ title: prompt.slice(0, 50) })
          .eq('user_id', userId)
          .eq('id', convId)

        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: prompt.slice(0, 50) } : c))
        )
      }
    } catch (err: unknown) {
      console.error(err)
      showToast('error', getErrorMessage(err))
    } finally {
      setIsSending(false)
      setTab('chat')
    }
  }

  const assistantCount = useMemo(
    () => messages.filter((m) => m.role === 'assistant').length,
    [messages]
  )

  const HistoryPanel = (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            History
          </div>
          <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
            Conversations
          </div>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            createNewConversation()
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-600"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      <div className="space-y-2">
        {loadingConversations ? (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        ) : conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            No history yet. Start your first conversation.
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeConversationId
            const isEditing = editingId === c.id

            return (
              <div
                key={c.id}
                className={[
                  'group rounded-2xl border p-3 transition',
                  isActive
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-slate-100 bg-white hover:border-slate-200',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      setActiveConversationId(c.id)
                      setTab('chat')
                    }}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                    <MessageSquareText size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      {isEditing ? (
                        <input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-blue-500"
                          placeholder="Conversation title"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        />
                      ) : (
                        <div className="truncate text-sm font-black text-slate-900">{c.title}</div>
                      )}

                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <Clock size={12} />
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            saveRename()
                          }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-blue-600"
                          title="Save"
                          aria-label="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            cancelRename()
                          }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            startRename(c)
                          }}
                          className="rounded-xl p-2 text-slate-300 opacity-0 transition hover:bg-slate-50 hover:text-slate-700 group-hover:opacity-100"
                          title="Rename"
                          aria-label="Rename"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            deleteConversation(c.id)
                          }}
                          className="rounded-xl p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          title="Delete"
                          aria-label="Delete conversation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )

  return (
    <AppShell>
      <Toast toast={toast} onClose={() => setToast({ open: false })} />

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Recruiter workspace
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            HireSync AI Dashboard
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Streaming AI + private history (Supabase RLS).
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          <LogOut size={16} className="text-slate-400" />
          Logout
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard
          label="Conversations"
          value={loadingConversations ? '…' : String(conversations.length)}
          hint="Saved in Supabase (RLS protected)"
        />
        <MetricCard
          label="AI answers"
          value={String(assistantCount)}
          hint="Assistant messages generated"
        />
        <MetricCard label="Time saved" value="~35h" hint="Demo metric (future analytics)" />
      </div>

      {/* Mobile tabs */}
      <div className="mt-4">
        <MobileTabs tab={tab} setTab={setTab} />
      </div>

      {/* Main layout */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
        {/* Chat */}
        <Card className={['min-w-0 p-4', tab === 'history' ? 'hidden md:block' : 'block'].join(' ')}>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Active
              </div>
              <div className="mt-1 truncate text-lg font-black tracking-tight text-slate-900">
                {activeConversation?.title ?? 'Select or create a conversation'}
              </div>
            </div>
          </div>

          <div className="space-y-3 pb-28">
            {loadingMessages ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-28" />
                <Skeleton className="h-20" />
              </>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Type a job title (e.g. “Frontend Developer”). You’ll see the AI answer streaming live.
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
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {m.role}
                    </div>

                    {m.role === 'assistant' && (
                      <button
                        onClick={() => copyText(m.id, m.content)}
                        className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-black text-blue-600 transition hover:bg-blue-50"
                        title="Copy"
                      >
                        {copiedMsgId === m.id ? <Check size={14} /> : <Clipboard size={14} />}
                        {copiedMsgId === m.id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>

                  <div className="whitespace-pre-wrap text-slate-800">{m.content}</div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="sticky bottom-0 border-t border-slate-100 bg-white pt-4">
            <form onSubmit={sendMessage} className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pozita (p.sh. Backend Developer)"
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
        </Card>

        {/* Right history panel */}
        <div className={tab === 'chat' ? 'hidden md:block' : 'block'}>{HistoryPanel}</div>
      </div>
    </AppShell>
  )
}
