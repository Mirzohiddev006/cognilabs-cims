import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MemberDashboard } from "@/components/member-dashboard";
import { PermissionGuard } from "@/components/permissionGuard";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const Member: React.FC = () => {
  return (
    <PermissionGuard required={["crm", "update_list", "finance_list"]}>
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
          <SiteHeader header="Member" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <MemberDashboard />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  );
};

export default Member;
