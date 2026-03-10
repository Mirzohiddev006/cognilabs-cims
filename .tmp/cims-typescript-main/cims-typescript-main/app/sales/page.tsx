"use client"

import { AppSidebar } from '@/components/app-sidebar'
import { ClientsTable } from '@/components/clients-table'
import { SalesStatsCards } from '@/components/salesStats'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'
import { PermissionGuard } from '@/components/permissionGuard'

const Page = () => {
  return (
    <PermissionGuard required="crm">
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
          <SiteHeader header="Sales" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SalesStatsCards />
                <ClientsTable />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGuard>
  )
}

export default Page
