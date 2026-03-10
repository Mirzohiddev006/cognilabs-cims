"use client";

import { useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,  
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUser,
  IconPhone,
  IconCheck,
  IconRocket,
  IconRepeat,
  IconTrophy,
  IconX,
} from "@tabler/icons-react";
import useSalesStore from "@/stores/useSalesStore";

const statConfig = [
  {
    key: "total_customers",
    label: "Total Customers",
    desc: "Total clients in CRM",
    icon: <IconUser className="size-4" />,
    trend: "+4%",
  },
  {
    key: "need_to_call",
    label: "Need to Call",
    desc: "Leads to be contacted",
    icon: <IconPhone className="size-4" />,
    trend: "-5%",
  },
  {
    key: "contacted",
    label: "Contacted",
    desc: "Initial contact made",
    icon: <IconCheck className="size-4" />,
    trend: "+8%",
  },
  {
    key: "project_started",
    label: "Project Started",
    desc: "Projects in kickoff phase",
    icon: <IconRocket className="size-4" />,
    trend: "+6%",
  },
  {
    key: "continuing",
    label: "Continuing",
    desc: "Ongoing projects",
    icon: <IconRepeat className="size-4" />,
    trend: "+2%",
  },
  {
    key: "finished",
    label: "Finished",
    desc: "Projects successfully completed",
    icon: <IconTrophy className="size-4" />,
    trend: "+10%",
  },
  {
    key: "rejected",
    label: "Rejected",
    desc: "Deals not closed",
    icon: <IconX className="size-4" />,
    trend: "-3%",
  },
];

export function SalesStatsCards() {
  const { statistics, fetchSales, loading, error } = useSalesStore();

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  if (loading) return <p className="p-4">Loading sales data...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statConfig.map(({ key, label, desc, icon, trend }) => {
          const value = statistics[key as keyof typeof statistics] ?? 0;
          const isPositive = trend.startsWith("+");
          const trendIcon = isPositive ? (
            <IconTrendingUp />
          ) : (
            <IconTrendingDown />
          );

          return (
            <Card
              key={key}
              className="@container/card transition-all duration-300 hover:scale-[1.01] *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs"
            >
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {value.toLocaleString()}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline" className="gap-1">
                    {trendIcon}
                    {trend}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="flex gap-2 font-medium line-clamp-1">
                  {desc} {icon}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
