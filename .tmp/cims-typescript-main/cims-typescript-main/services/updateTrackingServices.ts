import api from "@/lib/api";

export interface UpdateTrackingStats {
  user_id: number;
  user_name: string;
  total_updates: number;
  updates_this_week: number;
  updates_last_week: number;
  updates_this_month: number;
  updates_last_month: number;
  updates_last_3_months: number;
  percentage_this_week: number;
  percentage_last_week: number;
  percentage_this_month: number;
  percentage_last_3_months: number;
  expected_updates_per_week: number;
}

export interface CompanyUpdateStats {
  total_employees: number;
  total_updates_today: number;
  total_updates_this_week: number;
  avg_percentage_this_week: number;
  avg_percentage_last_week: number;
  avg_percentage_this_month: number;
  avg_percentage_last_3_months: number;
}

export interface GenericUpdateItem {
  [key: string]: string | number | boolean | null | undefined;
}

function normalizeUpdateList(data: unknown): GenericUpdateItem[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (
    data &&
    typeof data === "object" &&
    "updates" in data &&
    Array.isArray(data.updates)
  ) {
    return data.updates.filter(
      (item): item is GenericUpdateItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  return [];
}

export async function fetchCompanyUpdateStats(): Promise<CompanyUpdateStats> {
  const { data } = await api.get<CompanyUpdateStats>(
    "/update-tracking/company-stats",
  );
  return data;
}

export async function fetchMyUpdateStats(): Promise<UpdateTrackingStats> {
  const { data } = await api.get<UpdateTrackingStats>(
    "/update-tracking/stats/me",
  );
  return data;
}

export async function fetchRecentUpdates(
  limit = 20,
): Promise<GenericUpdateItem[]> {
  const { data } = await api.get<unknown>(`/update-tracking/recent?limit=${limit}`);
  return normalizeUpdateList(data);
}
