"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPermissionsOverview,
  toggleUserActive,
} from "@/services/ceoToolsServices";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function PermissionsOverviewPanel() {
  const queryClient = useQueryClient();
  const overviewQuery = useQuery({
    queryKey: ["ceo", "permissions-overview"],
    queryFn: fetchPermissionsOverview,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleUserActive,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ceo", "permissions-overview"],
      });
      toast.success("User status updated");
    },
    onError: () => {
      toast.error("Failed to toggle user status");
    },
  });

  if (overviewQuery.isLoading) {
    return <div className="px-4 py-8 text-sm text-muted-foreground">Loading permissions overview...</div>;
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return <div className="px-4 py-8 text-sm text-destructive">Failed to load permissions overview.</div>;
  }

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>{overview.total_users}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Available Pages</CardTitle>
          </CardHeader>
          <CardContent>{overview.available_pages.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permission Keys</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {overview.available_pages.slice(0, 8).map((page) => (
              <Badge key={page} variant="outline">
                {page}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users Permissions Overview</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "outline" : "destructive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-lg flex-wrap gap-1">
                      {user.permissions_display.slice(0, 6).map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {permission}
                        </Badge>
                      ))}
                      {user.permissions_display.length > 6 && (
                        <Badge variant="outline">
                          +{user.permissions_display.length - 6}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(user.user_id)}
                    >
                      Toggle Active
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
