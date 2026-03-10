"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCardStats,
  fetchFinanceAdvancedStats,
  fetchFinanceFilteredList,
  fetchFinanceList,
  fetchLiveExchangeRate,
  fetchMonthlyFinanceReport,
  fetchTopServices,
  fetchYearlyFinanceReport,
  resetDonationBalance,
  syncExchangeRate,
  topUpCard,
  transferBetweenCards,
} from "@/services/financeToolsServices";
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

const CARD_OPTIONS = ["card1", "card2", "card3"];

const getObjectEntries = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getUnknownList = (value: unknown, keys: string[]) => {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(getObjectEntries(item)));
  }

  const objectValue = getObjectEntries(value);
  if (!objectValue) {
    return [];
  }

  for (const key of keys) {
    const candidate = objectValue[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is Record<string, unknown> => Boolean(getObjectEntries(item)),
      );
    }
  }

  return [];
};

const getTextValue = (
  value: Record<string, unknown>,
  keys: string[],
  fallback = "-",
) => {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
    if (typeof candidate === "number") {
      return String(candidate);
    }
  }

  return fallback;
};

const getNumericValue = (
  value: Record<string, unknown> | null,
  keys: string[],
  fallback = 0,
) => {
  if (!value) {
    return fallback;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
};

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatDate = (value?: string) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : value || "-";
};

export function FinanceAdvancedPanel() {
  const queryClient = useQueryClient();
  const [topUpCardName, setTopUpCardName] = React.useState("card1");
  const [topUpAmount, setTopUpAmount] = React.useState("0");
  const [transferFrom, setTransferFrom] = React.useState("card1");
  const [transferTo, setTransferTo] = React.useState("card2");
  const [transferAmount, setTransferAmount] = React.useState("0");
  const [reportYear, setReportYear] = React.useState(String(new Date().getFullYear()));
  const [reportMonth, setReportMonth] = React.useState(String(new Date().getMonth() + 1));

  const financeListQuery = useQuery({
    queryKey: ["finance", "list"],
    queryFn: () => fetchFinanceList({ page: 1, per_page: 20 }),
  });

  const financeStatsQuery = useQuery({
    queryKey: ["finance", "advanced-stats"],
    queryFn: () => fetchFinanceAdvancedStats(),
  });

  const filteredListQuery = useQuery({
    queryKey: ["finance", "filtered-list"],
    queryFn: () => fetchFinanceFilteredList({ page: 1, per_page: 10 }),
  });

  const monthlyQuery = useQuery({
    queryKey: ["finance", "monthly-report", reportYear, reportMonth],
    queryFn: () =>
      fetchMonthlyFinanceReport(Number(reportYear), Number(reportMonth)),
  });

  const yearlyQuery = useQuery({
    queryKey: ["finance", "yearly-report", reportYear],
    queryFn: () => fetchYearlyFinanceReport(Number(reportYear)),
  });

  const topServicesQuery = useQuery({
    queryKey: ["finance", "top-services"],
    queryFn: () => fetchTopServices(10),
  });

  const cardStatsQuery = useQuery({
    queryKey: ["finance", "card-stats"],
    queryFn: fetchCardStats,
  });

  const liveRateQuery = useQuery({
    queryKey: ["finance", "live-rate"],
    queryFn: fetchLiveExchangeRate,
  });

  const filteredFinanceRows = React.useMemo(
    () => filteredListQuery.data?.finances ?? [],
    [filteredListQuery.data],
  );

  const topServiceRows = React.useMemo(
    () =>
      getUnknownList(topServicesQuery.data, [
        "top_services",
        "services",
        "items",
        "data",
      ]),
    [topServicesQuery.data],
  );

  const topServiceMeta = React.useMemo(
    () => getObjectEntries(topServicesQuery.data),
    [topServicesQuery.data],
  );

  const cardStatRows = React.useMemo(
    () =>
      getUnknownList(cardStatsQuery.data, [
        "card_statistics",
        "cards",
        "items",
        "data",
      ]),
    [cardStatsQuery.data],
  );

  const cardStatsMeta = React.useMemo(
    () => getObjectEntries(cardStatsQuery.data),
    [cardStatsQuery.data],
  );

  const invalidateFinance = async () => {
    await queryClient.invalidateQueries({ queryKey: ["finance"] });
  };

  const topUpMutation = useMutation({
    mutationFn: topUpCard,
    onSuccess: async () => {
      toast.success("Top up completed");
      await invalidateFinance();
    },
    onError: () => toast.error("Top up failed"),
  });

  const transferMutation = useMutation({
    mutationFn: transferBetweenCards,
    onSuccess: async () => {
      toast.success("Transfer completed");
      await invalidateFinance();
    },
    onError: () => toast.error("Transfer failed"),
  });

  const resetMutation = useMutation({
    mutationFn: resetDonationBalance,
    onSuccess: async () => {
      toast.success("Donation balance reset");
      await invalidateFinance();
    },
    onError: () => toast.error("Failed to reset donation balance"),
  });

  const syncRateMutation = useMutation({
    mutationFn: syncExchangeRate,
    onSuccess: async () => {
      toast.success("Exchange rate synced");
      await invalidateFinance();
    },
    onError: () => toast.error("Failed to sync exchange rate"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>{formatAmount(financeStatsQuery.data?.total_income ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Outcome</CardTitle>
          </CardHeader>
          <CardContent>{formatAmount(financeStatsQuery.data?.total_outcome ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
          </CardHeader>
          <CardContent>{formatAmount(financeStatsQuery.data?.net_profit ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live USD Rate</CardTitle>
          </CardHeader>
          <CardContent>{liveRateQuery.data?.formatted_rate ?? "-"}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top Up Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={topUpCardName} onValueChange={setTopUpCardName}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_OPTIONS.map((card) => (
                  <SelectItem key={card} value={card}>
                    {card}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} />
            <Button
              disabled={topUpMutation.isPending || Number(topUpAmount) <= 0}
              onClick={() =>
                topUpMutation.mutate({
                  card: topUpCardName,
                  amount: Number(topUpAmount),
                  transaction_status: "real",
                })
              }
            >
              Top Up
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer Between Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_OPTIONS.map((card) => (
                    <SelectItem key={card} value={card}>
                      {card}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_OPTIONS.map((card) => (
                    <SelectItem key={card} value={card}>
                      {card}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} />
            <Button
              variant="outline"
              disabled={
                transferMutation.isPending ||
                Number(transferAmount) <= 0 ||
                transferFrom === transferTo
              }
              onClick={() =>
                transferMutation.mutate({
                  from_card: transferFrom,
                  to_card: transferTo,
                  amount: Number(transferAmount),
                })
              }
            >
              Transfer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={() => resetMutation.mutate()}>
              Reset Donation Balance
            </Button>
            <Button variant="outline" onClick={() => syncRateMutation.mutate()}>
              Sync Exchange Rate
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(financeListQuery.data?.finances ?? []).map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.service}</TableCell>
                  <TableCell>{record.type}</TableCell>
                  <TableCell>{record.card}</TableCell>
                  <TableCell>{record.summ}</TableCell>
                  <TableCell>{record.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(financeListQuery.data?.finances ?? []).length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No finance records found.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Finance Reports</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Year</Label>
              <Input value={reportYear} onChange={(event) => setReportYear(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Input value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Monthly Net</div>
              <div className="text-lg font-semibold">{formatAmount(monthlyQuery.data?.net_amount ?? 0)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Yearly Net</div>
              <div className="text-lg font-semibold">{formatAmount(yearlyQuery.data?.yearly_net_amount ?? 0)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtered Finance List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Total Records</div>
                <div className="text-lg font-semibold">
                  {filteredListQuery.data?.total_count ?? 0}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Page</div>
                <div className="text-lg font-semibold">
                  {filteredListQuery.data?.page ?? 1} / {filteredListQuery.data?.total_pages ?? 1}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Has Next</div>
                <div className="text-lg font-semibold">
                  {filteredListQuery.data?.has_next ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFinanceRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No filtered finance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFinanceRows.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.service || "-"}</TableCell>
                        <TableCell className="capitalize">{record.type || "-"}</TableCell>
                        <TableCell>{record.card_display || record.card || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.transaction_status || record.status || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(record.summ)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Services Found</div>
                <div className="text-lg font-semibold">
                  {getNumericValue(topServiceMeta, [
                    "total_services_found",
                    "total_count",
                    "count",
                  ], topServiceRows.length)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Listed Rows</div>
                <div className="text-lg font-semibold">{topServiceRows.length}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServiceRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No top services returned.
                      </TableCell>
                    </TableRow>
                  ) : (
                    topServiceRows.map((item, index) => (
                      <TableRow key={`${getTextValue(item, ["service", "name"])}-${index}`}>
                        <TableCell>{getTextValue(item, ["service", "name", "title"])}</TableCell>
                        <TableCell className="text-right">
                          {getNumericValue(item, ["count", "transaction_count", "total_transactions"])}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(
                            getNumericValue(item, [
                              "amount",
                              "total_amount",
                              "summ",
                              "sum",
                            ]),
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Cards Found</div>
                <div className="text-lg font-semibold">
                  {getNumericValue(cardStatsMeta, ["total_cards", "count"], cardStatRows.length)}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Rows Listed</div>
                <div className="text-lg font-semibold">{cardStatRows.length}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Outcome</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardStatRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No card statistics returned.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cardStatRows.map((item, index) => (
                      <TableRow key={`${getTextValue(item, ["card", "card_name", "name"])}-${index}`}>
                        <TableCell>{getTextValue(item, ["card", "card_name", "card_display", "name"])}</TableCell>
                        <TableCell className="text-right">
                          {formatAmount(
                            getNumericValue(item, ["income", "total_income", "incoming"]),
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(
                            getNumericValue(item, ["outcome", "total_outcome", "expense", "expenses"]),
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(
                            getNumericValue(item, ["balance", "net_amount", "net_profit", "net"]),
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {getNumericValue(item, ["transaction_count", "transactions", "count"])}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
