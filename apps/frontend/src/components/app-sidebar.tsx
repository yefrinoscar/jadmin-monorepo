import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { useSession } from "@/lib/auth-client"
import { USER_ROLES, type UserRole } from "@/lib/constants"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Navigation data
const navMainItems = [
  {
    title: "Panel de Control",
    url: "/",
    icon: "LayoutDashboard",
    disabled: true,
  },
  {
    title: "Tickets",
    url: "/tickets",
    icon: "Ticket",
    disabled: true,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: "Building2",
    disabled: true,
  },
  {
    title: "Usuarios",
    url: "/usuarios",
    icon: "Users",
    disabled: false,
    roles: [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
  {
    title: "Chat Soporte",
    url: "/chat-soporte",
    icon: "MessageCircle",
    disabled: false,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { data: session, isPending } = useSession()
  const userRole = (session?.user as any)?.role as UserRole | undefined

  const filteredNavMain = React.useMemo(() => {
    return navMainItems.filter((item) => {
      // If roles are specified, check against user role
      if (item.roles) {
        // If session is loading, show the item to prevent flicker for admins
        if (isPending) return true
        
        // If loaded, strict check
        return userRole && (item.roles as string[]).includes(userRole)
      }
      return true
    })
  }, [userRole, isPending])

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <img 
                  src="/logo.svg" 
                  alt="jadmin logo" 
                  className="size-8 object-contain"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">jadmin</span>
                  <span className="truncate text-xs text-muted-foreground">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} currentPath={location.pathname} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

