"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { VerifyEmailForm } from "@/components/verify-email-form";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const value = searchParams.get("email");
    if (!value) {
      window.location.href = "/login";
      return;
    }
    setEmail(value);
  }, [searchParams]);

  if (!email) return null;

  return (
    <div className="flex justify-center items-center min-h-screen">
      <VerifyEmailForm email={email} />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
