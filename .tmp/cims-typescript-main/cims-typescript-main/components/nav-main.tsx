"use client"

import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import useAuthStore from "@/stores/useAuthStore"

// define the shape of nav items
export interface NavItem {
  title: string
  url: string
  icon?: Icon
  permission?: string // 👈 optional permission key
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname() || "/"
  const user = useAuthStore((s) => s.user)

  // ✅ filter by permission
  const allowedItems = (user
    ? items.filter((item) => {
        if (!item.permission) return true
        return user.permissions?.[item.permission] === true
      })
    : []
  )

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {allowedItems.map((item) => {
            const isActive =
              pathname === item.url || pathname.startsWith(item.url + "/")

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={isActive ? "bg-muted font-semibold" : ""}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Link
                    href={item.url}
                    className="flex items-center gap-2 w-full"
                    aria-label={item.title}
                  >
                    {item.icon && <item.icon className="!size-5" />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
