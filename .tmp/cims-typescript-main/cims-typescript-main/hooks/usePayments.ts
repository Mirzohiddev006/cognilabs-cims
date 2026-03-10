"use client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import api from "@/lib/api";

// Backend schema
export interface Payment {
  id: number;
  project: string;
  date: string; // yyyy-mm-dd
  summ: number;
  payment: boolean;
}

// Frontend form schema
export interface PaymentFormInput {
  projectName: string;
  nextPaymentDate: string; // ISO date (yyyy-mm-dd)
  amount: number;
  status: "Pending" | "Paid";
}

interface UsePaymentsReturn {
  payments: Payment[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  createPayment: UseMutationResult<
    Payment,
    Error,
    PaymentFormInput,
    unknown
  >["mutateAsync"];
  updatePayment: UseMutationResult<
    Payment,
    Error,
    { paymentId: number; formData: Partial<PaymentFormInput> },
    unknown
  >["mutateAsync"];
  deletePayment: UseMutationResult<
    number,
    Error,
    number,
    unknown
  >["mutateAsync"];
  togglePayment: UseMutationResult<
    Payment,
    Error,
    number,
    unknown
  >["mutateAsync"];
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  createError: Error | null;
  updateError: Error | null;
  deleteError: Error | null;
  toggleError: Error | null;
}

// Mapper: frontend → backend
const mapToPaymentSchema = (
  formData: PaymentFormInput
): Omit<Payment, "id"> => ({
  project: formData.projectName,
  date: formData.nextPaymentDate.split("T")[0],
  summ: formData.amount,
  payment: formData.status === "Paid",
});

const PAYMENTS_QUERY_KEY = ["payments"];

export const usePayments = (): UsePaymentsReturn => {
  const queryClient = useQueryClient();

  // ✅ Fetch all
  const {
    data: payments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Payment[]>({
    queryKey: PAYMENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get("/ceo/payments");
      // 👇 FIX: unwrap array from object
      return response.data.payments as Payment[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ✅ Create
  const createPaymentMutation = useMutation({
    mutationFn: async (formData: PaymentFormInput) => {
      const payload = mapToPaymentSchema(formData);
      const response = await api.post("/ceo/payments", payload);
      return response.data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    },
  });

  // ✅ Update
  const updatePaymentMutation = useMutation({
    mutationFn: async ({
      paymentId,
      formData,
    }: {
      paymentId: number;
      formData: Partial<PaymentFormInput>;
    }) => {
      const payload: Partial<Omit<Payment, "id">> = {
        ...(formData.projectName && { project: formData.projectName }),
        ...(formData.nextPaymentDate && { date: formData.nextPaymentDate }),
        ...(formData.amount !== undefined && { summ: formData.amount }),
        ...(formData.status && { payment: formData.status === "Paid" }),
      };
      const response = await api.put(`/ceo/payments/${paymentId}`, payload);
      return response.data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    },
  });

  // ✅ Delete
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      await api.delete(`/ceo/payments/${paymentId}`);
      return paymentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    },
  });

  // ✅ Toggle payment
  const togglePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await api.patch(`/ceo/payments/${paymentId}/toggle`);
      return response.data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    },
  });

  return {
    // Data
    payments,
    isLoading,
    isError,
    error,

    // Actions
    refetch,
    createPayment: createPaymentMutation.mutateAsync,
    updatePayment: updatePaymentMutation.mutateAsync,
    deletePayment: deletePaymentMutation.mutateAsync,
    togglePayment: togglePaymentMutation.mutateAsync,

    // Mutation states
    isCreating: createPaymentMutation.isPending,
    isUpdating: updatePaymentMutation.isPending,
    isDeleting: deletePaymentMutation.isPending,
    isToggling: togglePaymentMutation.isPending,

    // Errors
    createError: createPaymentMutation.error,
    updateError: updatePaymentMutation.error,
    deleteError: deletePaymentMutation.error,
    toggleError: togglePaymentMutation.error,
  };
};
