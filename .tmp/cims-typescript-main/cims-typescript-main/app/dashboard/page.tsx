import { AppSidebar } from "@/components/app-sidebar"
import { CeoMessagesPanel } from "@/components/ceo-messages-panel"
import { PermissionsOverviewPanel } from "@/components/permissions-overview-panel"

import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"


import { UsersTable } from "@/components/users-table"

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="sidebar" />
      <SidebarInset>
        <SiteHeader header="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Tabs defaultValue="overview" className="px-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                  <SectionCards />
                  <UsersTable />
                </TabsContent>
                <TabsContent value="permissions">
                  <PermissionsOverviewPanel />
                </TabsContent>
                <TabsContent value="messages">
                  <CeoMessagesPanel />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
