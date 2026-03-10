import { create } from "zustand";
import { fetchUsdToUzs } from "@/services/exchangeRateServices";

interface ExchangeRateState {
  rate: number | null;
  error: string | null;
  lastFetched: number | null;
  loading: boolean;
  fetchRate: () => Promise<void>;
}

export const useExchangeRateStore = create<ExchangeRateState>((set, get) => ({
  rate: null,
  error: null,
  lastFetched: null,
  loading: false,

  fetchRate: async () => {
    const { lastFetched } = get();
    const ONE_HOUR = 1000 * 60 * 60;

    // Use cached value if fetched within the last hour
    if (lastFetched && Date.now() - lastFetched < ONE_HOUR) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const rate = await fetchUsdToUzs();
      set({ rate, lastFetched: Date.now(), loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        loading: false,
      });
    }
  },
}));
