import { createFileRoute, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageCircle, Ticket, Building2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { authMiddleware } from '@/lib/middleware'

export const Route = createFileRoute('/')(
  { 
    component: DashboardPage,
    beforeLoad: () => {
      throw redirect({
        to: '/chat-soporte',
      })
    },
    server: {
      middleware: [authMiddleware],
    },
  }
)

function DashboardPage() {
  const stats = [
    {
      title: 'Usuarios',
      value: '24',
      description: 'usuarios activos',
      icon: Users,
      href: '/usuarios',
      active: true,
    },
    {
      title: 'Chat Soporte',
      value: '12',
      description: 'conversaciones activas',
      icon: MessageCircle,
      href: '/chat-soporte',
      active: true,
    },
    {
      title: 'Tickets',
      value: '8',
      description: 'tickets pendientes',
      icon: Ticket,
      href: '/tickets',
      active: false,
    },
    {
      title: 'Clientes',
      value: '156',
      description: 'clientes registrados',
      icon: Building2,
      href: '/clientes',
      active: false,
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={!stat.active ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Bienvenido a jadmin</CardTitle>
            <CardDescription>
              Panel de administración del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Utiliza el menú lateral para navegar entre las diferentes secciones del sistema.
              Actualmente solo están disponibles <strong>Usuarios</strong> y <strong>Chat Soporte</strong>.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/usuarios">
                  <Users className="mr-2 h-4 w-4" />
                  Usuarios
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/chat-soporte">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat Soporte
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              No hay actividad para mostrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Sin actividad reciente
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}