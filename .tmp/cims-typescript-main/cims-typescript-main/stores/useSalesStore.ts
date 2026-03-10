// stores/salesStore.ts
import { create } from "zustand";
import { getCrmStats } from "@/services/clientServices";

interface SalesStatistics {
  total_customers: number;
  need_to_call: number;
  contacted: number;
  project_started: number;
  continuing: number;
  finished: number;
  rejected: number;
  status_dict: Record<string, number>;
  status_percentages: Record<string, number>;
}

interface Sale {
  id: string | number;
  full_name: string;
  platform: string;
  username: string;
  phone_number: string;
  status: string;
  assistant_name: string;
  notes: string;
}

interface SalesState {
  sales: Sale[];
  statistics: SalesStatistics;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchSales: (force?: boolean) => Promise<void>;
  updateSaleInStore: (saleId: string | number, updatedData: Partial<Sale>) => void;
  reset: () => void;
}

const initialStatistics: SalesStatistics = {
  total_customers: 0,
  need_to_call: 0,
  contacted: 0,
  project_started: 0,
  continuing: 0,
  finished: 0,
  rejected: 0,
  status_dict: {},
  status_percentages: {},
};

const STALE_TIME = 60_000;

const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  statistics: initialStatistics,
  loading: false,
  error: null,
  lastFetched: null,

  fetchSales: async (force = false) => {
    const { lastFetched } = get();
    const now = Date.now();

    if (!force && lastFetched && now - lastFetched < STALE_TIME) return;

    set({ loading: true, error: null });

    try {
      const data = await getCrmStats();

      set({
        sales: [],
        statistics: {
          total_customers: data.total_customers ?? 0,
          need_to_call: data.need_to_call ?? 0,
          contacted: data.contacted ?? 0,
          project_started: data.project_started ?? 0,
          continuing: data.continuing ?? 0,
          finished: data.finished ?? 0,
          rejected: data.rejected ?? 0,
          status_dict: data.status_dict ?? {},
          status_percentages: data.status_percentages ?? {},
        },
        lastFetched: Date.now(),
      });
    } catch (e: any) {
      set({
        error: e?.response?.data?.message || e?.message || "Failed to load sales data",
      });
    } finally {
      set({ loading: false });
    }
  },

  updateSaleInStore: (saleId, updatedData) => {
    set((state) => {
      const updatedSales = state.sales.map((sale) =>
        sale.id === saleId ? { ...sale, ...updatedData } : sale
      );

      return { sales: updatedSales };
    });
  },

  reset: () => {
    set({
      sales: [],
      statistics: initialStatistics,
      loading: false,
      error: null,
      lastFetched: null,
    });
  },
}));

export default useSalesStore;
