"use client";

import React, { useEffect } from "react";
import { IconTrendingUp, IconTrendingDown, IconWallet, IconBuildingBank, IconCreditCard } from "@tabler/icons-react";
import ExchangeRate from "@/components/exchange-rate";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useFinanceStore } from "@/stores/financeDashboardStore";

export default function CardBalances() {
  const { balances, donation, fetchData, loading } = useFinanceStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cards = [
    { id: "totalUzs", title: "Total Balance", currency: "UZS", value: balances.totalUzs, trend: "up", icon: IconBuildingBank, isWide: true },
    { id: "potentialUzs", title: "Potential Balance", currency: "UZS", value: balances.potentialUzs, trend: "down", icon: IconBuildingBank, isWide: true },
    { id: "companyUzb", title: "Company Account UZB", currency: "UZS", value: balances.companyUzb, trend: "up", icon: IconBuildingBank, isWide: false },
    { id: "uzcardUzb", title: "Uzcard UZB", currency: "UZS", value: balances.uzcardUzb, trend: "down", icon: IconCreditCard, isWide: false },
    { id: "companyUs", title: "Company Account US", currency: "USD", value: balances.companyUs, trend: "up", icon: IconBuildingBank, isWide: false },
  ];

  if (loading) {
    return <div className="px-8 py-6">Loading balances...</div>;
  }

  return (
    <div className="space-y-8 px-4 md:px-8 pt-6">
      <ExchangeRate />

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map(({ id, title, currency, value, trend, icon: Icon, isWide }) => (
          <Card key={id} className={`group relative overflow-hidden rounded-xl border shadow-lg bg-card/70 backdrop-blur-sm ${isWide ? "col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-3" : "col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2"}`}>
            <div className="relative z-10 flex flex-col h-full p-6">
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-lg bg-muted/50 ring-1 ring-border">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {trend === "up" ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 ring-1 ring-green-500/30">
                        <IconTrendingUp className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600">Rising</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 ring-1 ring-red-500/30">
                        <IconTrendingDown className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-600">Falling</span>
                      </div>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg font-semibold text-foreground leading-tight">{title}</CardTitle>
              </CardHeader>
              <CardFooter className="p-0 mt-auto">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-bold tracking-tight tabular-nums ${isWide ? "text-3xl lg:text-4xl" : "text-2xl lg:text-3xl"}`}>
                      {value.toLocaleString()}
                    </span>
                    <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border hover:bg-muted transition-colors">{currency}</Badge>
                  </div>
                  <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/20 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, Math.max(20, (value / Math.max(...cards.map(c => c.value))) * 100))}%` }} />
                  </div>
                </div>
              </CardFooter>
            </div>
          </Card>
        ))}

        <Card className="col-span-full relative overflow-hidden rounded-xl border shadow-lg bg-muted/50">
          <div className="flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-lg bg-muted ring-1 ring-border">
                <IconWallet className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-semibold text-foreground">Donation Balance</span>
                <Badge variant="secondary" className="bg-muted text-muted-foreground border text-sm px-3 py-1">UZS</Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold tabular-nums text-foreground">{donation.toLocaleString()}</span>
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
