import api from "@/lib/api";

export interface InstagramGrowthResponse {
  current_followers: number;
  last_7_days: Record<string, number>;
  last_30_days: Record<string, number>;
  last_90_days: Record<string, number>;
  last_180_days: Record<string, number>;
  last_365_days: Record<string, number>;
}

export interface InstagramSetupPayload {
  account_username: string;
  instagram_business_account_id: string;
  facebook_page_id: string;
  access_token: string;
}

export async function fetchInstagramGrowth(): Promise<InstagramGrowthResponse> {
  const { data } = await api.get<InstagramGrowthResponse>("/instagram/growth");
  return data;
}

export async function syncInstagram(): Promise<string> {
  const { data } = await api.post<string>("/instagram/sync");
  return data;
}

export async function setupInstagram(
  payload: InstagramSetupPayload,
): Promise<string> {
  const { data } = await api.post<string>("/instagram/setup", payload);
  return data;
}

export async function fetchRecallRecipients(): Promise<unknown> {
  const { data } = await api.get<unknown>("/recall-bot/recipients");
  return data;
}

export async function processRecallReminders(): Promise<string> {
  const { data } = await api.post<string>("/recall-bot/process-reminders");
  return data;
}
