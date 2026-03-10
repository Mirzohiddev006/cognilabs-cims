import { AppSidebar } from "@/components/app-sidebar";
import { PermissionGuard } from "@/components/permissionGuard";
import {} from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WordpressSitePanel } from "@/components/wordpress-site-panel";
import WordpressProjects from "@/components/wordpress-projects";
import React from "react";

const page = () => {
  return (
    <PermissionGuard required={"project_toggle"}>
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
          <SiteHeader header="WordPress Projects" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <Tabs defaultValue="projects" className="px-4">
                  <TabsList>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="site">Site Control</TabsTrigger>
                  </TabsList>
                  <TabsContent value="projects">
                    <WordpressProjects />
                  </TabsContent>
                  <TabsContent value="site">
                    <WordpressSitePanel />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  );
};

export default page;
