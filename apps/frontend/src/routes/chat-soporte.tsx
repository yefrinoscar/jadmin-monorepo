import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { authMiddleware } from '@/lib/middleware'
import { WebSocketDemo } from '@/components/WebSocketDemo'

export const Route = createFileRoute('/chat-soporte')({
  component: ChatSoportePage,
  server: {
    middleware: [authMiddleware],
  },
})

function ChatSoportePage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chat Soporte</h2>
          <p className="text-muted-foreground">
            Atiende las consultas de los clientes
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar conversaciones..."
            className="pl-8"
          />
        </div>
        <Button variant="outline">Filtrar</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Conversaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Sin conversaciones activas
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat
            </CardTitle>
            <CardDescription>
              Selecciona una conversación para comenzar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Selecciona una conversación del panel izquierdo
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <WebSocketDemo />
      </div>
    </div>
  )
}
