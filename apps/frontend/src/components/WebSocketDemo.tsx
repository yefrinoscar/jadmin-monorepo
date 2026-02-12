import { useState } from 'react';
import { useWebSocket } from '../hooks/use-websocket';

export function WebSocketDemo() {
    const [inputValue, setInputValue] = useState('');
    const { status, messages, sendMessage } = useWebSocket('ws://localhost:8080');

    const handleSend = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
            setInputValue('');
        }
    };

    return (
        <div className="p-4 border rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">WebSocket Integration</h2>
            <div className="flex items-center gap-2 mb-4">
                Status:
                <span className={`px-2 py-1 rounded text-sm ${status === 'connected' ? 'bg-green-100 text-green-800' :
                        status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                    }`}>
                    {status}
                </span>
            </div>

            <div className="mb-4 space-y-2 max-h-40 overflow-y-auto border p-2 bg-gray-50 rounded">
                {messages.map((msg, idx) => (
                    <div key={idx} className="text-sm text-gray-700">
                        {msg}
                    </div>
                ))}
                {messages.length === 0 && (
                    <div className="text-gray-400 text-sm italic">No messages yet...</div>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded"
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                    onClick={handleSend}
                    disabled={status !== 'connected'}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
