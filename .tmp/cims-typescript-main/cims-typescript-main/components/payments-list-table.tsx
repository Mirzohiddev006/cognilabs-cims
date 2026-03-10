"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { usePayments, Payment } from "@/hooks/usePayments";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PaymentList = () => {
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    project: "",
    date: "",
    summ: 0,
    payment: false,
  });

  const {
    payments,
    isLoading,
    isError,
    error,
    refetch,
    updatePayment,
    deletePayment,
    togglePayment,
    isUpdating,
    isDeleting,
    isToggling,
    updateError,
    deleteError,
    toggleError,
  } = usePayments();

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setForm({
      project: payment.project,
      date: payment.date,
      summ: payment.summ,
      payment: payment.payment,
    });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        await deletePayment(id);
      } catch (err) {
        console.error("Failed to delete payment:", err);
      }
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await togglePayment(id);
    } catch (err) {
      console.error("Failed to update payment status:", err);
    }
  };

  const handleSave = async () => {
    if (!editingPayment) return;
    try {
      await updatePayment({
        paymentId: editingPayment.id,
        formData: {
          projectName: form.project,
          nextPaymentDate: form.date,
          amount: form.summ,
          status: form.payment ? "Paid" : "Pending",
        },
      });
      setEditingPayment(null);
    } catch (err) {
      console.error("Failed to update payment:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-background">
        <h2 className="text-2xl font-bold text-foreground mb-6">Payments</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading payments...
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-background">
        <h2 className="text-2xl font-bold text-foreground mb-6">Payments</h2>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-destructive text-center">
            <p className="text-lg font-medium">Error loading payments</p>
            <p className="text-sm text-muted-foreground">
              {error?.message || "Something went wrong"}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 bg-background">
      <div className="space-y-8 px-4 md:px-8 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Payments</h2>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-md border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-7 gap-4 p-4 bg-muted border-b border-border">
            <div className="text-sm font-medium text-muted-foreground">ID</div>
            <div className="text-sm font-medium text-muted-foreground">
              Project
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Date
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Summ
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Payment
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Toggle
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Actions
            </div>
          </div>

          {/* Body */}
          {!payments || payments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No payments added yet
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-7 gap-4 p-4 border-b border-border hover:bg-muted/50"
              >
                <div className="text-sm text-foreground">#{payment.id}</div>
                <div className="text-sm text-foreground">{payment.project}</div>
                <div className="text-sm text-foreground">
                  {formatDate(payment.date)}
                </div>
                <div className="text-sm text-foreground">
                  ${payment.summ?.toLocaleString() || "0"}
                </div>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.payment
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                    }`}
                  >
                    {payment.payment ? "Paid" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center">
                  <Switch
                    checked={payment.payment}
                    onCheckedChange={() => handleToggleStatus(payment.id)}
                    disabled={isToggling}
                  />
                </div>
                <div className="flex gap-2">
                  <Dialog
                    open={editingPayment?.id === payment.id}
                    onOpenChange={(open) => !open && setEditingPayment(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => handleEdit(payment)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs border-border text-foreground hover:bg-muted"
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Payment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Project</Label>
                          <Input
                            value={form.project}
                            onChange={(e) =>
                              setForm({ ...form, project: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={form.date}
                            onChange={(e) =>
                              setForm({ ...form, date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Summ</Label>
                          <Input
                            type="number"
                            value={form.summ}
                            onChange={(e) =>
                              setForm({ ...form, summ: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={form.payment}
                            onCheckedChange={(checked) =>
                              setForm({ ...form, payment: checked })
                            }
                          />
                          <Label>{form.payment ? "Paid" : "Pending"}</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleSave}
                          disabled={isUpdating}
                          className="w-full"
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    onClick={() => handleDelete(payment.id)}
                    disabled={isDeleting}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentList;
