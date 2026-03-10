import api from "@/lib/api";

export async function fetchUsdToUzs(): Promise<number> {
  const { data } = await api.get("/finance/exchange-rate");

  if (typeof data?.usd_to_uzs === "number") {
    return data.usd_to_uzs;
  }

  throw new Error("UZS rate not found in API response");
}
