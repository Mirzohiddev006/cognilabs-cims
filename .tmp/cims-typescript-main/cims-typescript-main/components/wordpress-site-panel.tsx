"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSiteStatus,
  fetchWordPressDashboard,
  toggleProjectActive,
  toggleSiteStatus,
} from "@/services/wordpressToolsServices";
import { useProjects } from "@/hooks/useWordpress";
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

export function WordpressSitePanel() {
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["wordpress", "dashboard"],
    queryFn: fetchWordPressDashboard,
  });
  const siteStatusQuery = useQuery({
    queryKey: ["wordpress", "site-status"],
    queryFn: fetchSiteStatus,
  });
  const projectsQuery = useProjects();

  const siteToggleMutation = useMutation({
    mutationFn: toggleSiteStatus,
    onSuccess: async () => {
      toast.success("Site status updated");
      await queryClient.invalidateQueries({ queryKey: ["wordpress"] });
    },
    onError: () => toast.error("Failed to toggle site status"),
  });

  const projectToggleMutation = useMutation({
    mutationFn: toggleProjectActive,
    onSuccess: async () => {
      toast.success("Project status updated");
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["wordpress"] });
    },
    onError: () => toast.error("Failed to toggle project"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Master Site Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={siteStatusQuery.data?.is_site_on ? "outline" : "destructive"}>
              {siteStatusQuery.data?.is_site_on ? "Online" : "Offline"}
            </Badge>
            <Button
              variant="outline"
              onClick={() => siteToggleMutation.mutate()}
              disabled={siteToggleMutation.isPending}
            >
              Toggle Site
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>{dashboardQuery.data?.projects.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(dashboardQuery.data?.permissions ?? []).slice(0, 5).map((permission) => (
              <Badge key={permission} variant="secondary">
                {permission}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(projectsQuery.data ?? []).map((project) => (
                <TableRow key={project.id}>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>{project.url}</TableCell>
                  <TableCell>
                    <Badge variant={project.is_active ? "outline" : "destructive"}>
                      {project.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={projectToggleMutation.isPending}
                      onClick={() => projectToggleMutation.mutate(project.id)}
                    >
                      Toggle
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
