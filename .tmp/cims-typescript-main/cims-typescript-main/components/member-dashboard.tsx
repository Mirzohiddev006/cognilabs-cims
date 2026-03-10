"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMemberUpdates, fetchSalaryEstimates } from "@/services/memberServices";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function MemberDashboard() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const updatesQuery = useQuery({
    queryKey: ["member", "updates"],
    queryFn: fetchMemberUpdates,
  });

  const salaryQuery = useQuery({
    queryKey: ["member", "salary-estimates", year, month],
    queryFn: () => fetchSalaryEstimates(year, month),
  });

  const isLoading = updatesQuery.isLoading || salaryQuery.isLoading;
  const hasError = updatesQuery.error || salaryQuery.error;

  const updates = updatesQuery.data ?? [];
  const salaryRows = salaryQuery.data ?? [];
  const updateColumns = updates.length > 0 ? Object.keys(updates[0]).slice(0, 5) : [];
  const salaryColumns = salaryRows.length > 0 ? Object.keys(salaryRows[0]).slice(0, 5) : [];

  if (isLoading) {
    return <div className="px-4 py-8 text-sm text-muted-foreground">Loading member data...</div>;
  }

  if (hasError) {
    return (
      <div className="space-y-4 px-4 py-8">
        <p className="text-sm text-destructive">Failed to load member data.</p>
        <Button
          variant="outline"
          onClick={() => {
            void updatesQuery.refetch();
            void salaryQuery.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>My Updates</CardDescription>
            <CardTitle>{updates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Salary Estimates</CardDescription>
            <CardTitle>{salaryRows.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Member Updates</CardTitle>
            <CardDescription>Data returned from `/members/member/updates`.</CardDescription>
          </CardHeader>
          <CardContent>
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No update records returned.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {updateColumns.map((column) => (
                        <TableHead key={column}>{column.replace(/_/g, " ")}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updates.map((item, index) => (
                      <TableRow key={`${index}-${String(item.id ?? index)}`}>
                        {updateColumns.map((column) => (
                          <TableCell key={column}>{formatValue(item[column])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{`Salary Estimates • ${month}/${year}`}</CardTitle>
            <CardDescription>Data returned from `/members/member/salary-estimates`.</CardDescription>
          </CardHeader>
          <CardContent>
            {salaryRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No salary estimate records returned.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {salaryColumns.map((column) => (
                        <TableHead key={column}>{column.replace(/_/g, " ")}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryRows.map((item, index) => (
                      <TableRow key={`${index}-${String(item.id ?? index)}`}>
                        {salaryColumns.map((column) => (
                          <TableCell key={column}>{formatValue(item[column])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
