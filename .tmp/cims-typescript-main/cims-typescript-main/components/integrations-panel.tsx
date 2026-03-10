"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInstagramGrowth,
  fetchRecallRecipients,
  processRecallReminders,
  setupInstagram,
  syncInstagram,
} from "@/services/integrationServices";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonPreview } from "@/components/json-preview";
import { toast } from "sonner";

export function IntegrationsPanel() {
  const queryClient = useQueryClient();
  const [setupForm, setSetupForm] = React.useState({
    account_username: "",
    instagram_business_account_id: "",
    facebook_page_id: "",
    access_token: "",
  });

  const growthQuery = useQuery({
    queryKey: ["integrations", "instagram-growth"],
    queryFn: fetchInstagramGrowth,
  });

  const recipientsQuery = useQuery({
    queryKey: ["integrations", "recall-recipients"],
    queryFn: fetchRecallRecipients,
  });

  const syncMutation = useMutation({
    mutationFn: syncInstagram,
    onSuccess: async () => {
      toast.success("Instagram sync started");
      await queryClient.invalidateQueries({ queryKey: ["integrations", "instagram-growth"] });
    },
    onError: () => toast.error("Failed to sync Instagram"),
  });

  const setupMutation = useMutation({
    mutationFn: setupInstagram,
    onSuccess: () => toast.success("Instagram setup saved"),
    onError: () => toast.error("Failed to save Instagram setup"),
  });

  const recallMutation = useMutation({
    mutationFn: processRecallReminders,
    onSuccess: () => toast.success("Recall reminders processed"),
    onError: () => toast.error("Failed to process recall reminders"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instagram Growth</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">
              {growthQuery.data?.current_followers ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Current followers</div>
            <Button variant="outline" onClick={() => syncMutation.mutate()}>
              Sync Instagram
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instagram Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={setupForm.account_username}
                onChange={(event) =>
                  setSetupForm((state) => ({
                    ...state,
                    account_username: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Business Account ID</Label>
              <Input
                value={setupForm.instagram_business_account_id}
                onChange={(event) =>
                  setSetupForm((state) => ({
                    ...state,
                    instagram_business_account_id: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook Page ID</Label>
              <Input
                value={setupForm.facebook_page_id}
                onChange={(event) =>
                  setSetupForm((state) => ({
                    ...state,
                    facebook_page_id: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                value={setupForm.access_token}
                onChange={(event) =>
                  setSetupForm((state) => ({
                    ...state,
                    access_token: event.target.value,
                  }))
                }
              />
            </div>
            <Button onClick={() => setupMutation.mutate(setupForm)}>Save setup</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recall Bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={() => recallMutation.mutate()}>
              Process Reminders
            </Button>
            <div className="text-sm text-muted-foreground">
              Trigger reminder processing manually from the UI.
            </div>
          </CardContent>
        </Card>

        <JsonPreview title="Recall Recipients" data={recipientsQuery.data ?? {}} />
      </div>

      <JsonPreview title="Instagram Growth Response" data={growthQuery.data ?? {}} />
    </div>
  );
}
