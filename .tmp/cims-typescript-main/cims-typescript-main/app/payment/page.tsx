import AddPaymentForm from '@/components/add-payment-form'
import { AppSidebar } from '@/components/app-sidebar'
import PaymentList from '@/components/payments-list-table'
import { PermissionGuard } from '@/components/permissionGuard'

import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'

const page = () => {
  return (
    <PermissionGuard required={"payment_list"} >
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
      <SiteHeader header="Payments" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <AddPaymentForm />
              <PaymentList />
              
             
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </PermissionGuard>
  )
}

export default page
