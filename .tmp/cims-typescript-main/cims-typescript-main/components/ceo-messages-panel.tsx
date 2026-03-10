"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMessage,
  fetchCeoMessages,
  sendMessageToAll,
  sendMessageToUser,
} from "@/services/ceoToolsServices";
import useDashboardStore from "@/stores/useAdminStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function CeoMessagesPanel() {
  const queryClient = useQueryClient();
  const users = useDashboardStore((state) => state.users);
  const fetchDashboard = useDashboardStore((state) => state.fetchDashboard);
  const [receiverId, setReceiverId] = React.useState<string>("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  React.useEffect(() => {
    if (users.length === 0) {
      void fetchDashboard();
    }
  }, [fetchDashboard, users.length]);

  const messagesQuery = useQuery({
    queryKey: ["ceo", "messages"],
    queryFn: fetchCeoMessages,
  });

  const invalidateMessages = () =>
    queryClient.invalidateQueries({ queryKey: ["ceo", "messages"] });

  const sendUserMutation = useMutation({
    mutationFn: sendMessageToUser,
    onSuccess: async () => {
      toast.success("Message sent");
      setSubject("");
      setBody("");
      setReceiverId("");
      await invalidateMessages();
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const sendAllMutation = useMutation({
    mutationFn: sendMessageToAll,
    onSuccess: async () => {
      toast.success("Broadcast sent");
      setSubject("");
      setBody("");
      await invalidateMessages();
    },
    onError: () => {
      toast.error("Failed to send broadcast");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: async () => {
      toast.success("Message deleted");
      await invalidateMessages();
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send To One User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Receiver</Label>
              <Select value={receiverId} onValueChange={setReceiverId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
            </div>
            <Button
              disabled={!receiverId || !subject.trim() || !body.trim() || sendUserMutation.isPending}
              onClick={() =>
                sendUserMutation.mutate({
                  receiver_id: Number(receiverId),
                  subject,
                  body,
                })
              }
            >
              Send message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Broadcast To All Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
            </div>
            <Button
              disabled={!subject.trim() || !body.trim() || sendAllMutation.isPending}
              variant="outline"
              onClick={() => sendAllMutation.mutate({ subject, body })}
            >
              Broadcast
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sent Messages</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {messagesQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading messages...</div>
          ) : messagesQuery.isError ? (
            <div className="text-sm text-destructive">Failed to load messages.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messagesQuery.data?.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>
                      <div>{message.receiver_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {message.receiver_email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{message.subject}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {message.body}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(message.sent_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(message.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
