"use client";

import * as React from "react";
import { requestPasswordReset, resetPassword } from "@/services/authServices";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AccountRecoveryForm() {
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleRequestReset = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Failed to send reset code"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await resetPassword({
        email,
        code,
        new_password: newPassword,
      });
      setMessage(response.message);
      setCode("");
      setNewPassword("");
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Account Recovery</CardTitle>
        <CardDescription>Forgot password and reset password tools.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>

        <Tabs defaultValue="forgot" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="forgot">Forgot Password</TabsTrigger>
            <TabsTrigger value="reset">Reset Password</TabsTrigger>
          </TabsList>
          <TabsContent value="forgot" className="space-y-4">
            <Button disabled={!email || loading} onClick={() => void handleRequestReset()}>
              Send Reset Code
            </Button>
          </TabsContent>
          <TabsContent value="reset" className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <Button
              disabled={!email || !code || !newPassword || loading}
              onClick={() => void handleResetPassword()}
            >
              Reset Password
            </Button>
          </TabsContent>
        </Tabs>

        {message && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>}
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </CardContent>
    </Card>
  );
}
