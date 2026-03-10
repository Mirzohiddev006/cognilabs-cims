"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster } from "sonner";
import { verifyOtp, resendVerificationCode } from "@/services/authServices";
import { getApiErrorMessage } from "@/lib/api-error";
import useAuthStore from "@/stores/useAuthStore";
import { Loader2, Clock, Mail } from "lucide-react";

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  // Timer state - 30 minutes = 1800 seconds
  const [timeLeft, setTimeLeft] = useState(1800);
  const [isExpired, setIsExpired] = useState(false);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleVerify = async () => {
    if (code.length < 4 || isExpired) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await verifyOtp(email, code);
      toast.success("Email verified successfully!");
      localStorage.removeItem("unverifiedEmail");
      if (response.access_token) {
        useAuthStore
          .getState()
          .setTokens(response.access_token, response.refresh_token ?? null);
        await useAuthStore.getState().fetchUser();
        router.push("/dashboard");
        return;
      }
      router.push("/login");
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Verification failed");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);

    try {
      await resendVerificationCode(email);
      setTimeLeft(1800); // Reset timer to 30 minutes
      setIsExpired(false);
      setCode(""); // Clear current code
      toast.success("Verification code sent!");
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to resend code");
      setError(message);
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      {/* Toaster for notifications */}
      <Toaster position="top-center" richColors closeButton />

      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>
              We sent a 4-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Timer Display */}
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Badge
                variant={
                  isExpired
                    ? "destructive"
                    : timeLeft < 300
                    ? "secondary"
                    : "outline"
                }
                className="font-mono"
              >
                {isExpired ? "Expired" : formatTime(timeLeft)}
              </Badge>
            </div>

            {/* OTP Input */}
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={isExpired}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Error Display */}

            {/* Expired Notice */}
            {isExpired && (
              <Alert>
                <AlertDescription>
                  Your verification code has expired. Please request a new one.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleVerify}
                disabled={isLoading || code.length < 4 || isExpired}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Verifying..." : "Verify Email"}
              </Button>

              {isExpired && (
                <Button
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isResending ? "Sending..." : "Send New Code"}
                </Button>
              )}
            </div>

            {/* Help Text */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the code? Check your spam folder.
              </p>
              {!isExpired && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-xs"
                >
                  {isResending ? "Sending..." : "Resend code"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
