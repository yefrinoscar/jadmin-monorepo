import { useEffect, useRef, useState } from 'react';

export function useWebSocket(url: string) {
    const [messages, setMessages] = useState<string[]>([]);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        setStatus('connecting');
        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            setStatus('connected');
            console.log('WebSocket connected');
        };

        ws.current.onmessage = (event) => {
            setMessages((prev) => [...prev, event.data]);
        };

        ws.current.onclose = () => {
            setStatus('disconnected');
            console.log('WebSocket disconnected');
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [url]);

    const sendMessage = (message: string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(message);
        }
    };

    return { status, messages, sendMessage };
}
