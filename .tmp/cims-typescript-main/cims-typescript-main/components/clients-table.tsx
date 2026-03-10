"use client";

import * as React from "react";
import { toast, Toaster } from "sonner";
import {
  Calendar,
  Edit,
  FileAudio,
  Loader2,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  StickyNote,
  Trash,
  User,
  Volume2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CRM_STATUS,
  buildCRMStatusOptions,
  getCanonicalCRMStatusValue,
  getCRMStatusLabel,
  getCRMStatusTone,
} from "@/lib/crm-statuses";
import useClientStore from "@/stores/useClientStore";
import type { Client } from "@/services/clientServices";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const PLATFORM_OPTIONS = ["Instagram", "WhatsApp", "Facebook", "Telegram", "Email", "Phone"];
const CUSTOMER_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "international", label: "International" },
];
const LANGUAGE_OPTIONS = [
  { value: "uz", label: "Uzbek" },
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
];

type DialogMode = "add" | "edit" | "delete" | "view-note" | "play-audio";
type FormState = {
  full_name: string;
  username: string;
  phone_number: string;
  platform: string;
  status: string;
  conversation_language: string;
  assistant_name: string;
  recall_time: string;
  customer_type: string;
  notes: string;
};

const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";

const toInputDateTimeValue = (value?: string | null) => {
  if (!value) {
    return "";
  }

  return value.includes("T") ? value.slice(0, 16) : value;
};

const toApiRecallTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/[+-]\d{2}:\d{2}$/.test(trimmed) || trimmed.endsWith("Z")) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00+05:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}+05:00`;
  }

  return trimmed;
};

const getFormState = (status: string, client?: Client | null): FormState => ({
  full_name: client?.full_name || "",
  username: client?.username || "",
  phone_number: client?.phone_number || "",
  platform: client?.platform || PLATFORM_OPTIONS[0],
  status: getCanonicalCRMStatusValue(client?.status) || status,
  conversation_language: client?.conversation_language || "uz",
  assistant_name: client?.assistant_name || "",
  recall_time: toInputDateTimeValue(client?.recall_time),
  customer_type: client?.customer_type || "",
  notes: client?.notes || "",
});

const formatDate = (value?: string) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "-";
};

export function ClientsTable() {
  const allClients = useClientStore((s) => s.clients);
  const clients = useClientStore((s) => s.filteredClients);
  const loading = useClientStore((s) => s.loading);
  const error = useClientStore((s) => s.error);
  const filters = useClientStore((s) => s.filters);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const addClient = useClientStore((s) => s.addClient);
  const updateClient = useClientStore((s) => s.updateClient);
  const deleteClient = useClientStore((s) => s.deleteClient);
  const clearError = useClientStore((s) => s.clearError);
  const setSearch = useClientStore((s) => s.setSearch);
  const setStatusFilter = useClientStore((s) => s.setStatusFilter);
  const setPlatformFilter = useClientStore((s) => s.setPlatformFilter);
  const setPhoneFilter = useClientStore((s) => s.setPhoneFilter);
  const setDateFilter = useClientStore((s) => s.setDateFilter);
  const clearFilters = useClientStore((s) => s.clearFilters);

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const urlSearch = searchParams.get("search") || "";
  const urlStatus = getCanonicalCRMStatusValue(searchParams.get("status_filter"));

  const statusOptions = React.useMemo(
    () =>
      buildCRMStatusOptions([
        ...allClients.map((client) => client.status),
        urlStatus,
      ]),
    [allClients, urlStatus],
  );

  const [dialogMode, setDialogMode] = React.useState<DialogMode>("add");
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [formState, setFormState] = React.useState<FormState>(getFormState(statusOptions[0]?.value ?? DEFAULT_CRM_STATUS));
  const [open, setOpen] = React.useState(false);
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [audioFileName, setAudioFileName] = React.useState("");
  const [viewingNote, setViewingNote] = React.useState("");
  const [playingAudioUrl, setPlayingAudioUrl] = React.useState("");
  const [dateStart, setDateStart] = React.useState("");
  const [dateEnd, setDateEnd] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      await fetchClients();
      if (!isMounted) return;
      if (urlSearch) {
        await setSearch(urlSearch);
      }
      if (!isMounted) return;
      if (urlStatus) {
        await setStatusFilter(urlStatus);
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [fetchClients, setSearch, setStatusFilter, urlSearch, urlStatus]);

  React.useEffect(() => {
    setFormState((current) => (current.status ? current : { ...current, status: statusOptions[0]?.value ?? DEFAULT_CRM_STATUS }));
  }, [statusOptions]);

  const resetDialog = React.useCallback(() => {
    setSelectedClient(null);
    setAudioFile(null);
    setAudioFileName("");
    setViewingNote("");
    setPlayingAudioUrl("");
    setFormState(getFormState(statusOptions[0]?.value ?? DEFAULT_CRM_STATUS));
  }, [statusOptions]);

  const syncUrl = (key: string, value?: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    window.history.pushState({}, "", next ? `${window.location.pathname}?${next}` : window.location.pathname);
  };

  const openForm = (mode: "add" | "edit", client?: Client) => {
    setDialogMode(mode);
    setSelectedClient(client ?? null);
    setFormState(getFormState(statusOptions[0]?.value ?? DEFAULT_CRM_STATUS, client));
    setOpen(true);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setAudioFile(null);
      setAudioFileName("");
      return;
    }
    if (!file.type.startsWith("audio/")) return toast.error("Please select an audio file.");
    if (file.size > 50 * 1024 * 1024) return toast.error("Audio file must be under 50MB.");
    setAudioFile(file);
    setAudioFileName(file.name);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.full_name.trim() || !formState.phone_number.trim() || !formState.platform || !formState.status) {
      return toast.error("Full name, phone, platform and status are required.");
    }

    const generatedUsername = formState.full_name.trim().toLowerCase().replace(/\s+/g, ".");
    const recallTime = toApiRecallTime(formState.recall_time);
    const payload = new FormData();
    payload.append("full_name", formState.full_name.trim());
    payload.append("username", formState.username.trim() || generatedUsername);
    payload.append("phone_number", formState.phone_number.trim());
    payload.append("platform", formState.platform);
    payload.append("status", getCanonicalCRMStatusValue(formState.status));
    payload.append("assistant_name", formState.assistant_name.trim());
    payload.append("notes", formState.notes.trim());
    payload.append("conversation_language", formState.conversation_language);
    if (recallTime) payload.append("recall_time", recallTime);
    if (dialogMode === "add" && formState.customer_type) payload.append("customer_type", formState.customer_type);
    if (dialogMode === "edit" && selectedClient?.recall_time && !recallTime) payload.append("clear_recall_time", "true");
    if (audioFile) payload.append("audio", audioFile, audioFile.name);

    setBusy(true);
    try {
      if (dialogMode === "edit" && selectedClient) {
        await updateClient(selectedClient.id, payload);
        toast.success("Client updated successfully");
      } else {
        await addClient(payload);
        toast.success("Client added successfully");
      }
      setOpen(false);
      resetDialog();
    } catch (submitError: unknown) {
      toast.error(submitError instanceof Error ? submitError.message : "Failed to save client");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    setBusy(true);
    try {
      await deleteClient(selectedClient.id);
      toast.success("Client deleted successfully");
      setOpen(false);
      resetDialog();
    } catch (deleteError: unknown) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete client");
    } finally {
      setBusy(false);
    }
  };

  if (loading && clients.length === 0) return <div className="px-4 py-8 text-sm text-muted-foreground">Loading clients...</div>;
  if (error) {
    return (
      <div className="space-y-4 px-4 py-8">
        <p className="text-sm text-destructive">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearError}>Dismiss</Button>
          <Button variant="outline" onClick={() => void fetchClients()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-6 space-y-6">
      <Toaster richColors position="top-right" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">Manage your clients ({clients.length} total)</p>
        </div>
        <Button onClick={() => openForm("add")} className="flex items-center gap-2"><Plus size={16} />Add Client</Button>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filters</h3>
          {(filters.search || filters.status || filters.platform || filters.phoneNumber || filters.dateRange) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { void clearFilters(); setDateStart(""); setDateEnd(""); window.history.pushState({}, "", window.location.pathname); }}>
              <X size={14} className="mr-1" />Clear
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input id="search" className="pl-9" defaultValue={urlSearch} placeholder="Name or username" onChange={(event) => { const value = event.target.value; void setSearch(value); syncUrl("search", value || null); }} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={getCanonicalCRMStatusValue(filters.status) || "all"} onValueChange={(value) => { const nextValue = value === "all" ? null : getCanonicalCRMStatusValue(value); void setStatusFilter(nextValue); syncUrl("status_filter", nextValue); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={filters.platform || "all"} onValueChange={(value) => void setPlatformFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All platforms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORM_OPTIONS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="phone-filter">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input id="phone-filter" className="pl-9" value={filters.phoneNumber} placeholder="Search by phone" onChange={(event) => void setPhoneFilter(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-start">Start date</Label>
            <Input id="date-start" type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-end">End date</Label>
            <div className="flex gap-2">
              <Input id="date-end" type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
              <Button variant="outline" onClick={() => void setDateFilter(dateStart, dateEnd || undefined)}><Calendar className="size-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead><TableHead>Platform</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Language</TableHead><TableHead>Assistant</TableHead><TableHead>Audio</TableHead><TableHead>Notes</TableHead><TableHead>Created</TableHead><TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No clients found.</TableCell></TableRow>
            ) : clients.map((client) => (
              <TableRow key={String(client.id)}>
                <TableCell><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback>{getInitials(client.full_name)}</AvatarFallback></Avatar><div><div className="font-medium">{client.full_name}</div><div className="text-xs text-muted-foreground">{client.username || "-"}</div></div></div></TableCell>
                <TableCell>{client.platform || "-"}</TableCell>
                <TableCell>{client.phone_number}</TableCell>
                <TableCell><span className={cn("inline-flex rounded border px-2 py-1 text-xs font-medium", getCRMStatusTone(client.status))}>{getCRMStatusLabel(client.status)}</span></TableCell>
                <TableCell>{LANGUAGE_OPTIONS.find((language) => language.value === client.conversation_language)?.label || client.conversation_language || "-"}</TableCell>
                <TableCell>{client.assistant_name ? <div className="flex items-center gap-1"><User size={12} className="text-muted-foreground" /><span>{client.assistant_name}</span></div> : "-"}</TableCell>
                <TableCell>{client.audio_url ? <Button variant="ghost" size="sm" onClick={() => { setPlayingAudioUrl(client.audio_url || ""); setDialogMode("play-audio"); setOpen(true); }}><Volume2 size={16} /></Button> : "-"}</TableCell>
                <TableCell>{client.notes ? <button type="button" className="flex items-center gap-1 text-left hover:text-primary" onClick={() => { setViewingNote(client.notes || ""); setDialogMode("view-note"); setOpen(true); }}><StickyNote size={14} className="text-muted-foreground" /><span>{client.notes.length > 36 ? `${client.notes.slice(0, 36)}...` : client.notes}</span></button> : "-"}</TableCell>
                <TableCell>{formatDate(client.created_at)}</TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openForm("edit", client)}><Edit size={14} className="mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setSelectedClient(client); setDialogMode("delete"); setOpen(true); }}><Trash size={14} className="mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { resetDialog(); clearError(); } }}>
        <DialogContent className="max-h-[95vh] max-w-lg overflow-y-auto">
          {(dialogMode === "add" || dialogMode === "edit") && (
            <>
              <DialogHeader><DialogTitle>{dialogMode === "add" ? "Add New Client" : "Edit Client"}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="full_name">Full Name *</Label><Input id="full_name" value={formState.full_name} onChange={(event) => setFormState((state) => ({ ...state, full_name: event.target.value }))} required /></div>
                  <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" value={formState.username} onChange={(event) => setFormState((state) => ({ ...state, username: event.target.value }))} placeholder="Optional username" /></div>
                  <div className="space-y-2"><Label htmlFor="phone_number">Phone *</Label><Input id="phone_number" value={formState.phone_number} onChange={(event) => setFormState((state) => ({ ...state, phone_number: event.target.value }))} required /></div>
                  <div className="space-y-2"><Label>Platform *</Label><Select value={formState.platform} onValueChange={(value) => setFormState((state) => ({ ...state, platform: value }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select platform" /></SelectTrigger><SelectContent>{PLATFORM_OPTIONS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Status *</Label><Select value={getCanonicalCRMStatusValue(formState.status) || formState.status} onValueChange={(value) => setFormState((state) => ({ ...state, status: getCanonicalCRMStatusValue(value) || value }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Language</Label><Select value={formState.conversation_language} onValueChange={(value) => setFormState((state) => ({ ...state, conversation_language: value }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select language" /></SelectTrigger><SelectContent>{LANGUAGE_OPTIONS.map((language) => <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="assistant_name">Assistant</Label><Input id="assistant_name" value={formState.assistant_name} onChange={(event) => setFormState((state) => ({ ...state, assistant_name: event.target.value }))} /></div>
                  <div className="space-y-2"><Label htmlFor="recall_time">Recall Time</Label><Input id="recall_time" type="datetime-local" value={formState.recall_time} onChange={(event) => setFormState((state) => ({ ...state, recall_time: event.target.value }))} /></div>
                  {dialogMode === "add" ? (
                    <div className="space-y-2"><Label>Customer Type</Label><Select value={formState.customer_type || "none"} onValueChange={(value) => setFormState((state) => ({ ...state, customer_type: value === "none" ? "" : value }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="none">Not selected</SelectItem>{CUSTOMER_TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                  ) : null}
                </div>
                <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" rows={3} value={formState.notes} onChange={(event) => setFormState((state) => ({ ...state, notes: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="audio-upload">Call Voice / Audio</Label><div className="flex items-center gap-2"><Input id="audio-upload" type="file" accept="audio/*" onChange={handleFile} className="cursor-pointer" />{audioFileName && <div className="flex items-center gap-1 rounded bg-muted px-3 py-1 text-sm"><FileAudio size={14} /><span className="truncate">{audioFileName}</span></div>}</div></div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); resetDialog(); }} disabled={busy} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={busy} className="flex-1">{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : dialogMode === "add" ? "Add Client" : "Save Changes"}</Button>
                </div>
              </form>
            </>
          )}

          {dialogMode === "delete" && selectedClient && (
            <>
              <DialogHeader><DialogTitle>Delete Client</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="font-medium">{selectedClient.full_name}</span>?</p>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => { setOpen(false); resetDialog(); }} disabled={busy} className="flex-1">Cancel</Button>
                <Button variant="destructive" onClick={() => void confirmDelete()} disabled={busy} className="flex-1">{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete Client"}</Button>
              </div>
            </>
          )}

          {dialogMode === "view-note" && (
            <>
              <DialogHeader><DialogTitle>Client Note</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="max-h-96 overflow-y-auto rounded-md bg-muted p-4"><p className="whitespace-pre-wrap text-sm">{viewingNote}</p></div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(viewingNote); toast.success("Note copied"); }}>{viewingNote ? "Copy" : "Close"}</Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                </div>
              </div>
            </>
          )}

          {dialogMode === "play-audio" && (
            <>
              <DialogHeader><DialogTitle>Play Call Recording</DialogTitle></DialogHeader>
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 rounded-md bg-muted p-8"><Volume2 size={48} className="text-primary" /><audio src={playingAudioUrl} controls autoPlay className="w-full" /></div>
                <div className="flex justify-end"><Button variant="outline" onClick={() => setOpen(false)}>Close</Button></div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
