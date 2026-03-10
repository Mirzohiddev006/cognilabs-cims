"use client";

import * as React from "react";
import { useState } from "react";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  Project,
} from "@/hooks/useWordpress";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toaster, toast } from "sonner";
import { Plus, Repeat } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function WordpressProjects() {
  const { data, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "delete">(
    "add"
  );
  const [form, setForm] = useState({
    name: "",
    url: "",
    description: "",
    is_active: true,
  });
  const [loadingAction, setLoadingAction] = useState(false);

  React.useEffect(() => {
    if (!open) {
      setSelectedProject(null);
      setForm({ name: "", url: "", description: "", is_active: true });
    }
  }, [open]);

  if (isLoading)
    return <div className="p-6 text-center">Loading projects...</div>;

  const handleAddClick = () => {
    setDialogMode("add");
    setOpen(true);
  };

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setForm({
      name: project.name,
      url: project.url,
      description: project.description,
      is_active: project.is_active,
    });
    setDialogMode("edit");
    setOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDialogMode("delete");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.url) {
      toast.error("Name and URL are required");
      return;
    }

    setLoadingAction(true);
    try {
      if (dialogMode === "add") {
        await createProject.mutateAsync(form);
        toast.success("Project added");
      } else if (dialogMode === "edit" && selectedProject) {
        await updateProject.mutateAsync({ id: selectedProject.id, ...form });
        toast.success("Project updated");
      }
      setOpen(false);
    } catch (err) {
      let message = "Action failed";
      if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    setLoadingAction(true);
    try {
      await deleteProject.mutateAsync(selectedProject.id);
      toast.success("Project deleted");
      setOpen(false);
    } catch (err) {
      let message = "Failed to delete";
      if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="mx-4 my-6">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Projects ({data?.length || 0})
        </h2>
        <Button onClick={handleAddClick} className="flex items-center gap-2">
          <Plus size={16} /> Add Project
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.length ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              data.map((project: Project) => (
                <TableRow key={project.id} className="hover:bg-muted/50">
                  <TableCell>{project.name}</TableCell>
                  <TableCell>
                    <a
                      href={
                        project.url.startsWith("http")
                          ? project.url
                          : `https://${project.url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {project.url}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={project.is_active ? "success" : "destructive"}
                      className="text-xs"
                    >
                      {project.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Repeat size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleEditClick(project)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(project)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add"
                ? "Add Project"
                : dialogMode === "edit"
                ? "Edit Project"
                : "Delete Project"}
            </DialogTitle>
          </DialogHeader>

          {dialogMode === "delete" && selectedProject ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-medium">{selectedProject.name}</span>?
              </p>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                  disabled={loadingAction}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  className="flex-1"
                  disabled={loadingAction}
                >
                  {loadingAction ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_active: checked })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                  disabled={loadingAction}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loadingAction}
                >
                  {loadingAction ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
