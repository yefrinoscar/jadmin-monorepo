import { Link } from "@tanstack/react-router"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Ticket,
  Building2,
  Users,
  MessageCircle,
} from "lucide-react"

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="size-4" />,
  Ticket: <Ticket className="size-4" />,
  Building2: <Building2 className="size-4" />,
  Users: <Users className="size-4" />,
  MessageCircle: <MessageCircle className="size-4" />,
}

export function NavMain({
  items,
  currentPath,
}: {
  items: {
    title: string
    url: string
    icon: string
    disabled?: boolean
  }[]
  currentPath: string
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = currentPath === item.url
          const icon = iconMap[item.icon]

          return (
            <SidebarMenuItem key={item.title}>
              {item.disabled ? (
                <SidebarMenuButton
                  tooltip={item.title}
                  className="opacity-50 cursor-not-allowed"
                >
                  {icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link to={item.url}>
                    {icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
