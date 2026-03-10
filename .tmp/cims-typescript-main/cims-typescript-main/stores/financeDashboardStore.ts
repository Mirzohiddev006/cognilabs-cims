// store/financeStore.ts
import { create } from "zustand";
import { fetchFinanceDashboard, FinanceDashboard } from "@/services/financeDashboardService";

interface FinanceState {
  exchangeRate: string;
  balances: {
    totalUzs: number;
    potentialUzs: number;
    companyUzb: number;
    uzcardUzb: number;
    companyUs: number;
  };
  donation: number;
  loading: boolean;
  fetchData: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  exchangeRate: "",
  balances: {
    totalUzs: 0,
    potentialUzs: 0,
    companyUzb: 0,
    uzcardUzb: 0,
    companyUs: 0,
  },
  donation: 0,
  loading: false,
  fetchData: async () => {
    set({ loading: true });
    try {
      const data = await fetchFinanceDashboard();
      set({
        exchangeRate: data.exchange_rate,
        balances: {
          totalUzs: parseFloat(data.balances.total_balance),
          potentialUzs: parseFloat(data.balances.potential_balance),
          companyUzb: parseFloat(data.balances.card1_balance),
          uzcardUzb: parseFloat(data.balances.card2_balance),
          companyUs: parseFloat(data.balances.card3_balance),
        },
        donation: parseFloat(data.donation_balance),
      });
    } finally {
      set({ loading: false });
    }
  },
}));
