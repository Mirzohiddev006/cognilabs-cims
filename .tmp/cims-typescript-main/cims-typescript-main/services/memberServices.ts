import api from "@/lib/api";
import type { GenericUpdateItem } from "@/services/updateTrackingServices";

export interface SalaryEstimateRecord {
  [key: string]: string | number | boolean | null | undefined;
}

function normalizeRecordList(data: unknown): GenericUpdateItem[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray(data.items)
  ) {
    return data.items.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  return [];
}

export async function fetchMemberUpdates(): Promise<GenericUpdateItem[]> {
  const { data } = await api.get<unknown>("/members/member/updates");
  return normalizeRecordList(data);
}

export async function fetchSalaryEstimates(
  year: number,
  month: number,
): Promise<SalaryEstimateRecord[]> {
  const { data } = await api.get<unknown>(
    `/members/member/salary-estimates?year=${year}&month=${month}`,
  );
  return normalizeRecordList(data);
}
