"use client";

import * as React from "react";
import {
  IconDashboard,
  IconHome,
  IconChartBar,
  IconReport,
  IconCreditCard,
  IconCircleCheck,
  IconAppWindow,
  IconPlugConnected,
} from "@tabler/icons-react"
import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useAuthStore from "@/stores/useAuthStore";
import { isAuthenticated } from "@/helpers/authHelpers";
import { useRouter } from "next/navigation";

const navMain: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",  
    icon: IconHome,
    permission: "ceo",
  },
  { title: "Sales", url: "/sales", icon: IconChartBar, permission: "crm" },
  { title: "Finance", url: "/finance", icon: IconReport, permission: "finance_list" },
  { title: "Payment", url: "/payment", icon: IconCreditCard, permission: "payment_list" },
  { title: "WordPress", url: "/wordpress", icon: IconAppWindow, permission: "project_toggle" },
  { title: "Updates", url: "/update-list", icon: IconCircleCheck, permission: "update_list" },
  { title: "Integrations", url: "/integrations", icon: IconPlugConnected, permission: "ceo" },
  
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const fetchUser = useAuthStore.getState().fetchUser;
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = React.useState(false);

  // Check authentication & load user
  React.useEffect(() => {
    if (!isAuthenticated()) {
      setCheckedAuth(true);
      return;
    }

    if (!user && !loading) {
      fetchUser().finally(() => setCheckedAuth(true));
    } else {
      setCheckedAuth(true);
    }
  }, [user, loading, fetchUser]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (checkedAuth && !isAuthenticated()) {
      router.push("/login");
    }
  }, [checkedAuth, router]);

  // Loading state while checking auth
  if (!checkedAuth) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">
          Checking authentication...
        </span>
      </div>
    );
  }

  // If not authenticated, render nothing (redirect will fire)
  if (!isAuthenticated()) {
    return null;
  }

  const displayUser = {
    name: user ? `${user.name} ${user.surname}` : "Loading...",
    email: user?.email ?? "",
    avatar: "/avatars/default.jpg",
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <span className="text-base font-semibold">Cognilabs</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
