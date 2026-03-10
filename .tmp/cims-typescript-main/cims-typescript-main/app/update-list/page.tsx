import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { UpdateTrackingDashboard } from "@/components/update-tracking-dashboard"
import { PermissionGuard } from "@/components/permissionGuard"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page() {
  return (
    <PermissionGuard required="update_list">
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
          <SiteHeader header="Update List" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <UpdateTrackingDashboard />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  )
}
