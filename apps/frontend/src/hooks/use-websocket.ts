import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types matching backend WS protocol ──────────────────────────────────────

export interface CollectedInfo {
    name?: string | null;
    email?: string | null;
    reason?: string | null;
    phone?: string | null;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface ServerMessage {
    type: 'connected' | 'response' | 'cleared' | 'error';
    conversationId?: string;
    content?: string;
    collectedInfo?: CollectedInfo;
    needsHuman?: boolean;
    infoComplete?: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useChatSocket(url: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [collectedInfo, setCollectedInfo] = useState<CollectedInfo>({});
    const [needsHuman, setNeedsHuman] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const shouldConnect = useRef(false);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        shouldConnect.current = true;
        setStatus('connecting');
        const socket = new WebSocket(url);
        ws.current = socket;

        socket.onopen = () => {
            setStatus('connected');
        };

        socket.onmessage = (event) => {
            try {
                const data: ServerMessage = JSON.parse(event.data);

                if (data.type === 'connected') {
                    if (data.conversationId) {
                        setConversationId(data.conversationId);
                    }
                }

                if (data.type === 'response') {
                    setIsTyping(false);
                    if (data.content) {
                        setMessages((prev) => [
                            ...prev,
                            { role: 'assistant', content: data.content!, timestamp: new Date() },
                        ]);
                    }
                    if (data.collectedInfo) setCollectedInfo(data.collectedInfo);
                    if (data.needsHuman !== undefined) setNeedsHuman(data.needsHuman);
                }

                if (data.type === 'cleared') {
                    setMessages([]);
                    setCollectedInfo({});
                    setNeedsHuman(false);
                }

                if (data.type === 'error' && data.content) {
                    setIsTyping(false);
                    setMessages((prev) => [
                        ...prev,
                        { role: 'system', content: data.content!, timestamp: new Date() },
                    ]);
                }
            } catch {
                // ignore non-JSON messages
            }
        };

        socket.onclose = () => {
            setStatus('disconnected');
            ws.current = null;
        };

        socket.onerror = () => {
            setStatus('disconnected');
        };
    }, [url]);

    const disconnect = useCallback(() => {
        shouldConnect.current = false;
        ws.current?.close();
        ws.current = null;
        setStatus('disconnected');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            ws.current?.close();
        };
    }, []);

    const sendMessage = useCallback((content: string) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;

        // Add user message to local state immediately
        setMessages((prev) => [
            ...prev,
            { role: 'user', content, timestamp: new Date() },
        ]);

        setIsTyping(true);

        ws.current.send(JSON.stringify({ type: 'message', content }));
    }, []);

    const clearChat = useCallback(() => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
        ws.current.send(JSON.stringify({ type: 'clear' }));
    }, []);

    return {
        status,
        messages,
        conversationId,
        collectedInfo,
        needsHuman,
        isTyping,
        connect,
        disconnect,
        sendMessage,
        clearChat,
    };
}
