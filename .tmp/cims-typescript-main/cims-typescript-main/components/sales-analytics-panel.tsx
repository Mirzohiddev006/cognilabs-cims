"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignSalesManager,
  type CRMPeriodicStatusSummaryResponse,
  type DetailedSalesResponse,
  fetchConversionRate,
  fetchCustomerSalesManager,
  fetchDetailedSales,
  fetchInternationalSales,
  fetchPeriodReport,
  fetchSalesManagers,
  fetchSalesStats,
  fetchStatusSummary,
} from "@/services/crmToolsServices";
import {
  CRM_STATUS_DEFINITIONS,
  getCRMStatusLabel,
  getCRMStatusTone,
} from "@/lib/crm-statuses";
import { cn } from "@/lib/utils";
import useClientStore from "@/stores/useClientStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SUMMARY_PERIODS: Array<{
  key: keyof CRMPeriodicStatusSummaryResponse;
  label: string;
}> = [
  { key: "today", label: "Today" },
  { key: "last_3_days", label: "Last 3 Days" },
  { key: "last_7_days", label: "Last 7 Days" },
  { key: "last_30_days", label: "Last 30 Days" },
  { key: "last_90_days", label: "Last 90 Days" },
];

const DAILY_SUMMARY_KEYS: Array<keyof DetailedSalesResponse["summary"]> = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
];

const DAILY_SUMMARY_LABELS: Record<
  keyof DetailedSalesResponse["summary"],
  string
> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  customer_type: "Customer Type",
};

const formatCompactDate = (value?: string) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : value || "-";
};

const getLeadText = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
  }

  return "-";
};

export function SalesAnalyticsPanel() {
  const queryClient = useQueryClient();
  const clients = useClientStore((state) => state.clients);
  const fetchClients = useClientStore((state) => state.fetchClients);
  const [period, setPeriod] = React.useState("7d");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [customerId, setCustomerId] = React.useState<string>("");
  const [managerId, setManagerId] = React.useState<string>("");
  const [lookupCustomerId, setLookupCustomerId] = React.useState<string>("");
  const [currentManager, setCurrentManager] = React.useState<string>("");

  React.useEffect(() => {
    if (clients.length === 0) {
      void fetchClients();
    }
  }, [clients.length, fetchClients]);

  const summaryQuery = useQuery({
    queryKey: ["crm", "summary"],
    queryFn: fetchStatusSummary,
  });

  const reportQuery = useQuery({
    queryKey: ["crm", "period-report", period, statusFilter],
    queryFn: () =>
      fetchPeriodReport({
        period,
        status_filter: statusFilter || undefined,
      }),
  });

  const conversionQuery = useQuery({
    queryKey: ["crm", "conversion-rate"],
    queryFn: fetchConversionRate,
  });

  const salesStatsQuery = useQuery({
    queryKey: ["sales", "stats"],
    queryFn: () => fetchSalesStats(),
  });

  const detailedSalesQuery = useQuery({
    queryKey: ["sales", "detailed", 14],
    queryFn: () => fetchDetailedSales({ days: 14 }),
  });

  const internationalQuery = useQuery({
    queryKey: ["sales", "international"],
    queryFn: () => fetchInternationalSales(20),
  });

  const managersQuery = useQuery({
    queryKey: ["crm", "sales-managers"],
    queryFn: fetchSalesManagers,
  });

  const assignMutation = useMutation({
    mutationFn: assignSalesManager,
    onSuccess: async () => {
      toast.success("Sales manager assigned");
      setCustomerId("");
      setManagerId("");
      await queryClient.invalidateQueries({ queryKey: ["crm", "sales-managers"] });
    },
    onError: () => toast.error("Failed to assign sales manager"),
  });

  const handleLookup = async () => {
    if (!lookupCustomerId) return;
    try {
      const result = await fetchCustomerSalesManager(Number(lookupCustomerId));
      setCurrentManager(result);
    } catch {
      setCurrentManager("Not found");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {conversionQuery.data?.conversion_rate ?? 0}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today Leads</CardTitle>
          </CardHeader>
          <CardContent>{salesStatsQuery.data?.today ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent>{salesStatsQuery.data?.this_week ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Available Statuses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {CRM_STATUS_DEFINITIONS.slice(0, 6).map((status) => (
              <Badge key={status.value} variant="outline">
                {status.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Period Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3d">3d</SelectItem>
                    <SelectItem value="7d">7d</SelectItem>
                    <SelectItem value="15d">15d</SelectItem>
                    <SelectItem value="30d">30d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status Filter</Label>
                <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {CRM_STATUS_DEFINITIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {reportQuery.data && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Customers</div>
                  <div className="text-xl font-semibold">
                    {reportQuery.data.total_customers}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">From</div>
                  <div className="text-sm font-medium">{reportQuery.data.from_date}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">To</div>
                  <div className="text-sm font-medium">{reportQuery.data.to_date}</div>
                </div>
              </div>
            )}

            {reportQuery.data?.customers?.length ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Platform</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportQuery.data.customers.slice(0, 10).map((customer, index) => (
                      <TableRow key={`${String(customer.id ?? index)}-${index}`}>
                        <TableCell>{String(customer.full_name ?? "-")}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded border px-2 py-1 text-xs font-medium",
                              getCRMStatusTone(String(customer.status ?? "")),
                            )}
                          >
                            {getCRMStatusLabel(String(customer.status ?? ""))}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">{String(customer.platform ?? "-")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No customers returned for this period.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Manager Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.slice(0, 50).map((client) => (
                      <SelectItem key={String(client.id)} value={String(client.id)}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sales Manager</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {(managersQuery.data ?? []).map((manager) => (
                      <SelectItem key={manager.id} value={String(manager.id)}>
                        {manager.name} {manager.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              disabled={!customerId || !managerId || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({
                  customer_id: Number(customerId),
                  sales_manager_id: Number(managerId),
                })
              }
            >
              Assign manager
            </Button>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label>Lookup current manager by customer ID</Label>
                <Input value={lookupCustomerId} onChange={(event) => setLookupCustomerId(event.target.value)} />
              </div>
              <Button className="self-end" variant="outline" onClick={() => void handleLookup()}>
                Check
              </Button>
            </div>
            {currentManager && (
              <div className="rounded-md border p-3 text-sm">
                Current assignment: <span className="font-medium">{currentManager}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CRM Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading summary...</div>
            ) : summaryQuery.isError || !summaryQuery.data ? (
              <div className="text-sm text-muted-foreground">Summary data is unavailable.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {SUMMARY_PERIODS.map(({ key, label }) => {
                  const periodData = summaryQuery.data[key];
                  if (!periodData || typeof periodData !== "object") {
                    return null;
                  }

                  return (
                    <div key={key} className="rounded-md border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            Total customers
                          </div>
                        </div>
                        <div className="text-2xl font-semibold">
                          {periodData.total_customers ?? 0}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {CRM_STATUS_DEFINITIONS.map((status) => {
                          const count = periodData.status_stats?.[status.value] ?? 0;
                          const percentage =
                            periodData.status_percentages?.[status.value] ?? 0;

                          return (
                            <div
                              key={`${key}-${status.value}`}
                              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                            >
                              <span className="text-sm">{status.label}</span>
                              <div className="text-right text-xs text-muted-foreground">
                                <div className="font-medium text-foreground">{count}</div>
                                <div>{Number(percentage).toFixed(0)}%</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Daily Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailedSalesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading detailed sales...</div>
            ) : detailedSalesQuery.isError || !detailedSalesQuery.data ? (
              <div className="text-sm text-muted-foreground">Detailed sales data is unavailable.</div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {DAILY_SUMMARY_KEYS.map((key) => (
                    <div key={key} className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">
                        {DAILY_SUMMARY_LABELS[key]}
                      </div>
                      <div className="text-xl font-semibold">
                        {detailedSalesQuery.data.summary[key] ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Date range: {detailedSalesQuery.data.date_range || "-"}
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Lead Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedSalesQuery.data.daily_breakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No daily sales data.
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailedSalesQuery.data.daily_breakdown.map((item) => (
                          <TableRow key={item.date}>
                            <TableCell>{formatCompactDate(item.date)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.count}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>International Sales Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(internationalQuery.data ?? []).slice(0, 10).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No international leads returned.
                    </TableCell>
                  </TableRow>
                ) : (
                  (internationalQuery.data ?? []).slice(0, 10).map((item, index) => {
                    const lead = item as Record<string, unknown>;
                    const statusValue = getLeadText(lead, ["status", "customer_status"]);

                    return (
                      <TableRow key={`${getLeadText(lead, ["id", "full_name", "username"])}-${index}`}>
                        <TableCell>{getLeadText(lead, ["full_name", "name", "username"])}</TableCell>
                        <TableCell>{getLeadText(lead, ["phone_number", "phone"])}</TableCell>
                        <TableCell>{getLeadText(lead, ["platform"])}</TableCell>
                        <TableCell>
                          {statusValue === "-" ? (
                            "-"
                          ) : (
                            <span
                              className={cn(
                                "inline-flex rounded border px-2 py-1 text-xs font-medium",
                                getCRMStatusTone(statusValue),
                              )}
                            >
                              {getCRMStatusLabel(statusValue)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
