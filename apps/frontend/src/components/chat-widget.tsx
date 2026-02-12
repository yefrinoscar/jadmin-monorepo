import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { useChatSocket, type ChatMessage } from '@/hooks/use-websocket'
import { cn } from '@/lib/utils'

const BACKEND_WS_URL = (typeof window !== 'undefined'
    ? import.meta.env.VITE_BACKEND_URL?.replace(/^http/, 'ws')
    : '') || 'ws://localhost:8080'

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const {
        status,
        messages,
        isTyping,
        connect,
        disconnect,
        sendMessage,
    } = useChatSocket(BACKEND_WS_URL)

    // Connect when widget opens, disconnect when it closes
    useEffect(() => {
        if (isOpen) {
            connect()
        }
    }, [isOpen, connect])

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length, isTyping])

    function handleSend() {
        const content = input.trim()
        if (!content || status !== 'connected') return
        sendMessage(content)
        setInput('')
    }

    function handleClose() {
        setIsOpen(false)
        disconnect()
    }

    // Floating button when closed
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                aria-label="Abrir chat de soporte"
            >
                <MessageCircle className="h-6 w-6" />
            </button>
        )
    }

    // Chat window when open
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] h-[520px] rounded-2xl bg-background border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <div>
                        <p className="text-sm font-semibold">Soporte JAdmin</p>
                        <p className="text-[10px] opacity-80">
                            {status === 'connected' ? 'En línea' : status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleClose}
                        className="rounded-full p-1.5 hover:bg-white/20 transition-colors"
                        aria-label="Cerrar chat"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
                {messages.length === 0 && !isTyping && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Bot className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">¡Hola! 👋</p>
                        <p className="text-xs mt-1">Escribe un mensaje para comenzar</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <WidgetBubble key={i} message={msg} />
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-background px-3 py-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        placeholder="Escribe tu mensaje..."
                        disabled={status !== 'connected'}
                        className="flex-1 rounded-full border bg-muted/50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 placeholder:text-muted-foreground"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || status !== 'connected'}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                        aria-label="Enviar mensaje"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Powered by JAdmin AI
                </p>
            </div>
        </div>
    )
}

// ─── Widget Message Bubble ───────────────────────────────────────────────────

function WidgetBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'

    if (isSystem) {
        return (
            <div className="flex justify-center">
                <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {message.content}
                </span>
            </div>
        )
    }

    return (
        <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                    isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md',
                )}
            >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className={cn(
                    'text-[10px] mt-0.5',
                    isUser ? 'text-primary-foreground/50' : 'text-muted-foreground',
                )}>
                    {message.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    )
}
