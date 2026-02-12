import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MessageCircle,
  Search,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  UserPlus,
  ArrowUpRight,
  RefreshCw,
  Send,
  Bot,
} from 'lucide-react'
import { authMiddleware } from '@/lib/middleware'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/chat-soporte')({
  component: ChatSoportePage,
  server: {
    middleware: [authMiddleware],
  },
})

// ─── Status helpers ──────────────────────────────────────────────────────────

type ConversationStatus = 'active' | 'waiting' | 'closed' | 'escalated'

const STATUS_CONFIG: Record<ConversationStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Activa', color: 'bg-green-500/10 text-green-700 dark:text-green-400', icon: MessageCircle },
  waiting: { label: 'Esperando', color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', icon: Clock },
  escalated: { label: 'Escalada', color: 'bg-red-500/10 text-red-700 dark:text-red-400', icon: AlertTriangle },
  closed: { label: 'Cerrada', color: 'bg-muted text-muted-foreground', icon: CheckCircle2 },
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
      <config.icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function ChatSoportePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>(undefined)
  const [search, setSearch] = useState('')

  const statsQuery = trpc.conversation.stats.useQuery()
  const listQuery = trpc.conversation.list.useQuery(
    { status: statusFilter, limit: 50 },
    { refetchInterval: 5000 },
  )

  const conversations = listQuery.data ?? []
  const filtered = search
    ? conversations.filter((c) => {
        const info = c.collectedInfo
        const text = [info?.name, info?.email, info?.reason, c.id].filter(Boolean).join(' ').toLowerCase()
        return text.includes(search.toLowerCase())
      })
    : conversations

  const stats = statsQuery.data

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chat Soporte</h2>
          <p className="text-muted-foreground">
            Atiende las consultas de los clientes en tiempo real
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { listQuery.refetch(); statsQuery.refetch() }}
          disabled={listQuery.isFetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", listQuery.isFetching && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard label="Activas" value={stats.active} icon={MessageCircle} color="text-green-600" />
          <StatsCard label="Esperando" value={stats.waiting} icon={Clock} color="text-yellow-600" />
          <StatsCard label="Escaladas" value={stats.escalated} icon={AlertTriangle} color="text-red-600" />
          <StatsCard label="Total" value={stats.total} icon={Users} color="text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, email..."
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {([undefined, 'active', 'waiting', 'escalated', 'closed'] as const).map((s) => (
            <Button
              key={s ?? 'all'}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="h-8 text-xs"
            >
              {s ? STATUS_CONFIG[s].label : 'Todas'}
              {s && stats ? ` (${stats[s]})` : ''}
            </Button>
          ))}
        </div>
      </div>

      {/* Main grid: conversation list + chat panel */}
      <div className="grid gap-4 md:grid-cols-[340px_1fr] flex-1 min-h-0">
        {/* Conversation list */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-sm font-medium">
              Conversaciones ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {listQuery.isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Sin conversaciones
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={cn(
                      'w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors',
                      selectedId === conv.id && 'bg-muted',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {conv.collectedInfo?.name || 'Visitante anónimo'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.collectedInfo?.email || conv.collectedInfo?.reason || `${conv.messageCount} mensajes`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(conv.updatedAt)}
                        </span>
                        <StatusBadge status={conv.status} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat panel */}
        {selectedId ? (
          <ChatPanel
            conversationId={selectedId}
            onClose={() => setSelectedId(null)}
            onRefreshList={() => { listQuery.refetch(); statsQuery.refetch() }}
          />
        ) : (
          <Card className="flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Selecciona una conversación</p>
              <p className="text-xs mt-1">del panel izquierdo para ver los mensajes</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Stats Card ──────────────────────────────────────────────────────────────

function StatsCard({ label, value, icon: Icon, color }: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className={cn('rounded-lg bg-muted p-2', color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

function ChatPanel({
  conversationId,
  onClose,
  onRefreshList,
}: {
  conversationId: string
  onClose: () => void
  onRefreshList: () => void
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messageInput, setMessageInput] = useState('')
  const [optimisticMessages, setOptimisticMessages] = useState<Array<{ id: string; role: string; content: string; createdAt: string }>>([])

  const convQuery = trpc.conversation.getById.useQuery({ id: conversationId })
  const messagesQuery = trpc.conversation.messages.useQuery(
    { conversationId },
    { refetchInterval: 3000 },
  )

  const closeMutation = trpc.conversation.close.useMutation({
    onSuccess: () => { convQuery.refetch(); onRefreshList() },
  })
  const escalateMutation = trpc.conversation.escalate.useMutation({
    onSuccess: () => { convQuery.refetch(); onRefreshList() },
  })
  const assignMutation = trpc.conversation.assign.useMutation({
    onSuccess: () => { convQuery.refetch(); onRefreshList() },
  })
  const sendMessageMutation = trpc.conversation.sendMessage.useMutation({
    onSuccess: () => {
      messagesQuery.refetch().then(() => {
        // Clear optimistic messages once real data arrives
        setOptimisticMessages([])
      })
      convQuery.refetch()
      onRefreshList()
    },
    onError: () => {
      // Remove failed optimistic message
      setOptimisticMessages([])
    },
  })

  const conv = convQuery.data
  const serverMessages = messagesQuery.data ?? []

  // Merge server messages with optimistic ones (avoid duplicates by checking if server already has them)
  const lastServerTime = serverMessages.length > 0 ? serverMessages[serverMessages.length - 1].createdAt : ''
  const pendingOptimistic = optimisticMessages.filter((om) => om.createdAt > lastServerTime)
  const messages = [...serverMessages, ...pendingOptimistic]

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const isClosed = conv?.status === 'closed'
  const isHumanControlled = !!conv?.assignedToId

  function handleSendMessage() {
    const content = messageInput.trim()
    if (!content || sendMessageMutation.isPending) return

    // Optimistic: show message immediately
    setOptimisticMessages((prev) => [
      ...prev,
      {
        id: `optimistic-${Date.now()}`,
        role: 'system',
        content,
        createdAt: new Date().toISOString(),
      },
    ])
    setMessageInput('')

    sendMessageMutation.mutate({ conversationId, content, role: 'system' })
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Chat header */}
      <CardHeader className="border-b py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium truncate">
                {conv?.collectedInfo?.name || 'Visitante anónimo'}
              </CardTitle>
              {conv && <StatusBadge status={conv.status} />}
              {isHumanControlled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                  <UserPlus className="h-3 w-3" />
                  Control humano
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {conv?.collectedInfo?.email && <span>{conv.collectedInfo.email}</span>}
              {conv?.collectedInfo?.phone && <span>{conv.collectedInfo.phone}</span>}
              {conv?.collectedInfo?.reason && (
                <span className="truncate max-w-[200px]" title={conv.collectedInfo.reason}>
                  {conv.collectedInfo.reason}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {conv && !isClosed && (
              <>
                {!isHumanControlled && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => escalateMutation.mutate({ id: conversationId })}
                    disabled={escalateMutation.isPending || conv.status === 'escalated'}
                  >
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Escalar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => closeMutation.mutate({ id: conversationId })}
                  disabled={closeMutation.isPending}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cerrar
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Takeover banner */}
      {!isHumanControlled && !isClosed && (
        <div className="bg-yellow-500/10 border-b px-4 py-2 text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
          <Bot className="h-3.5 w-3.5" />
          <span>La IA está respondiendo. Escribe un mensaje para tomar el control.</span>
        </div>
      )}

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[60vh]">
        {messagesQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Sin mensajes aún
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Agent message input */}
      {!isClosed && (
        <div className="border-t px-4 py-3">
          <div className="flex gap-2">
            <Input
              placeholder={isHumanControlled ? 'Responde al visitante...' : 'Escribe para tomar el control del chat...'}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer info */}
      {conv && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{conv.messageCount} mensajes</span>
          <span>
            {conv.visitorIp && `IP: ${conv.visitorIp}`}
            {isHumanControlled && ' · Control humano'}
          </span>
          <span>Creada: {new Date(conv.createdAt).toLocaleString('es')}</span>
        </div>
      )}
    </Card>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

const AI_MODEL = 'Mistral AI'

function MessageBubble({ message }: { message: { role: string; content: string; createdAt: string } }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isAgent = message.role === 'system'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : isAgent
              ? 'bg-blue-600 text-white rounded-bl-md'
              : 'bg-muted rounded-bl-md',
        )}
      >
        {isAssistant && (
          <div className="flex items-center gap-1.5 mb-1">
            <Bot className="h-3 w-3 text-blue-500" />
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
              {AI_MODEL}
            </span>
          </div>
        )}
        {isAgent && (
          <div className="flex items-center gap-1.5 mb-1">
            <UserPlus className="h-3 w-3 text-blue-200" />
            <span className="text-[10px] font-medium text-blue-200">
              Agente
            </span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={cn(
          'text-[10px] mt-1',
          isUser ? 'text-primary-foreground/60' : isAgent ? 'text-blue-200' : 'text-muted-foreground',
        )}>
          {isUser ? 'Visitante' : isAssistant ? 'IA' : 'Agente'}
          {' · '}
          {new Date(message.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
