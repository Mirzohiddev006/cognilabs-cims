import api from "@/lib/api";

export interface FinanceDashboard {
  exchange_rate: string;
  balances: {
    total_balance: string;
    potential_balance: string;
    card1_balance: string;
    card2_balance: string;
    card3_balance: string;
  };
  donation_balance: string;
}

export async function fetchFinanceDashboard(): Promise<FinanceDashboard> {
  const { data } = await api.get<FinanceDashboard>("/finance/dashboard");
  return data;
}
