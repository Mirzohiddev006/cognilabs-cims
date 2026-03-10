"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { usePayments, type PaymentFormInput } from "@/hooks/usePayments";
import { Toaster, toast } from "sonner"; // ✅ import both Toaster and toast

const AddPaymentForm = () => {
  const [date, setDate] = useState<Date | null>(null);
  const [projectName, setProjectName] = useState("");
  const [amount, setAmount] = useState("");

  const { createPayment, isCreating, createError } = usePayments();

  const formatDate = (date: Date | null) => {
    if (!date) return "mm/dd/yyyy";
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!date) {
      toast.error("Next payment date is required");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      const paymentData: PaymentFormInput = {
        projectName: projectName.trim(),
        nextPaymentDate: date.toISOString(),
        amount: parseFloat(amount),
        status: "Pending", // ✅ valid literal type
      };

      await createPayment(paymentData);

      setProjectName("");
      setDate(null);
      setAmount("");

      toast.success("Payment added successfully");
    } catch {
      toast.error("Failed to create payment. Please try again.");
    }
  };

  return (
    <div className="p-0 bg-background">
      <div className="space-y-8 px-4 md:px-8 pt-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Cognilabs</h1>
          <h2 className="text-2xl font-bold text-foreground">Add Payment</h2>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Input
              type="text"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isCreating}
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start text-left font-normal"
                  disabled={isCreating}
                >
                  <CalendarIcon className="mr-3 h-4 w-4" />
                  <span>{date ? formatDate(date) : "Next Payment Date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ?? undefined}
                  onSelect={(selectedDate) => setDate(selectedDate ?? null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            disabled={isCreating}
          />

          {createError && (
            <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
              Failed to create payment. Please try again.
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isCreating}
            className="w-full h-12"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Payment...
              </>
            ) : (
              "Add Payment"
            )}
          </Button>
        </div>
      </div>

      {/* ✅ render Toaster once */}
      <Toaster richColors position="top-right" />
    </div>
  );
};

export default AddPaymentForm;
