"use client"

import * as React from "react"
import { IconTrendingDown, IconTrendingUp, IconUsers, IconWallet, IconPhone, IconClock } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import useDashboardStore from "@/stores/useAdminStats"

export function SectionCards() {
  const todayCustomers = useDashboardStore((s) => s.todayCustomers)
  const needToCallCount = useDashboardStore((s) => s.needToCallCount)
  const totalBalance = useDashboardStore((s) => s.totalBalance)
  const duePaymentsToday = useDashboardStore((s) => s.duePaymentsToday)
  const loading = useDashboardStore((s) => s.loading)
  const error = useDashboardStore((s) => s.error)
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard)

  React.useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) {
    return <div className="p-4">Loading dashboard...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>
  }

  const customersCount = todayCustomers?.length || 0
  const contactedCount = todayCustomers?.filter(c => c.status === "contacted").length || 0
  const pendingCount = todayCustomers?.filter(c => c.status !== "contacted").length || 0

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 gap-4 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">

      {/* Today's Customers Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Today's Customers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {customersCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {customersCount > 0 ? "+1" : "0"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Contacted: {contactedCount} <IconUsers className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Pending: {pendingCount}
          </div>
        </CardFooter>
      </Card>

      {/* Need to Call Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Need to Call</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {needToCallCount}
          </CardTitle>
          <CardAction>
            <Badge variant={needToCallCount > 0 ? "outline" : "outline"}>
              {needToCallCount > 0 ? <IconTrendingDown /> : <IconTrendingUp />}
              {needToCallCount > 0 ? "-" : "+"}
              {Math.abs(needToCallCount)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Follow-ups required <IconPhone className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {needToCallCount === 0 ? "All customers contacted" : "Action required"}
          </div>
        </CardFooter>
      </Card>

      {/* Total Balance Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Balance</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalBalance.formatted}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              UZS
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Account balance <IconWallet className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {totalBalance.uzs > 0 ? `${totalBalance.uzs.toLocaleString()} UZS` : "No balance"}
          </div>
        </CardFooter>
      </Card>

      {/* Due Payments Today Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Due Payments Today</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {duePaymentsToday}
          </CardTitle>
          <CardAction>
            <Badge variant={duePaymentsToday > 0 ? "outline" : "outline"}>
              {duePaymentsToday > 0 ? <IconTrendingDown /> : <IconTrendingUp />}
              {duePaymentsToday > 0 ? "-" : "+"}
              {Math.abs(duePaymentsToday)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Payments due <IconClock className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {duePaymentsToday > 0 ? "Follow up required" : "All payments current"}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}