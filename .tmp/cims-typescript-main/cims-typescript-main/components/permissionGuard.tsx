"use client";
import React, { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MessageCircle, Shield } from "lucide-react";
import useAuthStore from "@/stores/useAuthStore";

type Props = {
  required: string | string[];
  children: ReactNode;
};

export function PermissionGuard({ required, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const fetchUser = useAuthStore.getState().fetchUser;
  const router = useRouter();

  // Fetch user if not loaded
  React.useEffect(() => {
    if (!user) {
      fetchUser().catch(() => {
        router.push("/login");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty dependency → run once

  // Check if user has required permission(s)
  const hasPermission = (
    permissions: Record<string, unknown>,
    required: string | string[]
  ) => {
    const checkSinglePermission = (perm: string): boolean => {
      // Handle dot notation (e.g., "crm.clients.view")
      if (perm.includes(".")) {
        const parts = perm.split(".");
        let current = permissions as Record<string, unknown>;

        for (const part of parts) {
          if (current && typeof current === "object" && part in current) {
            current = current[part] as Record<string, unknown>;
          } else {
            return false;
          }
        }

        return current as unknown as boolean;
      }

      // Handle simple permission (e.g., "crm")
      const value = permissions[perm];

      // If it's a boolean, return it directly
      if (typeof value === "boolean") {
        return value;
      }

      // If it's an object, check if it exists (has any permissions)
      if (typeof value === "object" && value !== null) {
        return true;
      }

      return false;
    };

    if (Array.isArray(required)) {
      return required.some((perm) => checkSinglePermission(perm));
    }

    return checkSinglePermission(required);
  };

  const allowed = user?.permissions
    ? hasPermission(user.permissions, required)
    : false;

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="relative">
            <div className="h-8 w-8 rounded-full border-2 border-muted animate-spin border-t-primary" />
            <Loader2 className="absolute inset-0 h-8 w-8 animate-pulse text-primary/20" />
          </div>
          <span className="text-sm font-medium">Checking permissions...</span>
        </div>
      </div>
    );
  }

  if (!allowed) {
    const requiredPerms = Array.isArray(required)
      ? required.join(", ")
      : required;

    return (
      <div className="flex h-full items-center justify-center p-6 bg-gradient-to-br from-background to-muted/20">
        <div className="w-full max-w-md space-y-8">
          {/* Big animated icon */}
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24 group">
              {/* Animated background rings */}
              <div className="absolute inset-0 rounded-full bg-destructive/5 animate-pulse" />
              <div
                className="absolute inset-2 rounded-full bg-destructive/10 animate-ping"
                style={{ animationDuration: "2s" }}
              />
              <div className="absolute inset-4 rounded-full bg-destructive/20" />

              {/* Main icon */}
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center border border-destructive/20 group-hover:border-destructive/30 transition-colors">
                <Shield className="h-12 w-12 text-destructive group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 rounded-full bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">
                Access Denied
              </h2>
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  You don&apos;t have the required permissions to view this
                  page.
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Required:{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                    {requiredPerms}
                  </code>
                </p>
              </div>
            </div>
          </div>

          {/* User info */}
          {user && (
            <Alert className="border-muted bg-muted/30">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-sm">
                <div className="space-y-1">
                  <div className="font-medium">
                    {user.name} {user.surname}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Role: {user.role}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Contact info */}
          <Alert className="  to-blue-50/40 hover:from-blue-50 hover:to-blue-50/60 transition-colors">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <span className="text-muted-foreground">
                Need access? Reach out to{" "}
              </span>
              <a
                href="https://t.me/saidbek_ab"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors inline-flex items-center gap-1"
              >
                @saidbek_ab
                <MessageCircle className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-full group hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
