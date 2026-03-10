import api from "@/lib/api";

export interface MessageRecord {
  id: number;
  receiver_name: string;
  receiver_email: string;
  subject: string;
  body: string;
  sent_at: string;
}

export interface MessageListResponse {
  messages: MessageRecord[];
}

export interface SendMessageToUserPayload {
  receiver_id: number;
  subject: string;
  body: string;
}

export interface SendMessageToAllPayload {
  subject: string;
  body: string;
}

export interface UserPermissionsOverviewItem {
  user_id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  permissions: string[];
  permissions_display: string[];
  permissions_count: number;
}

export interface UserPermissionsOverviewResponse {
  users: UserPermissionsOverviewItem[];
  total_users: number;
  available_pages: string[];
  summary: Record<string, number>;
}

export interface ToggleUserActiveResponse {
  is_active: boolean;
  active_user_count: number;
  inactive_user_count: number;
}

export interface RedirectResponse {
  redirect_url: string;
}

export interface SuccessResponse {
  success?: boolean;
  message: string;
}

export async function fetchCeoMessages(): Promise<MessageRecord[]> {
  const { data } = await api.get<MessageListResponse>("/ceo/messages");
  return data.messages ?? [];
}

export async function sendMessageToUser(
  payload: SendMessageToUserPayload,
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>("/ceo/send-message", payload);
  return data;
}

export async function sendMessageToAll(
  payload: SendMessageToAllPayload,
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(
    "/ceo/send-message-all",
    payload,
  );
  return data;
}

export async function deleteMessage(messageId: number): Promise<SuccessResponse> {
  const { data } = await api.delete<SuccessResponse>(
    `/ceo/messages/${messageId}`,
  );
  return data;
}

export async function fetchPermissionsOverview(): Promise<UserPermissionsOverviewResponse> {
  const { data } = await api.get<UserPermissionsOverviewResponse>(
    "/ceo/users/permissions/overview",
  );
  return data;
}

export async function toggleUserActive(
  userId: number,
): Promise<ToggleUserActiveResponse> {
  const { data } = await api.patch<ToggleUserActiveResponse>(
    `/ceo/users/${userId}/toggle-active`,
  );
  return data;
}

export async function fetchDashboardRedirect(): Promise<string> {
  const { data } = await api.get<RedirectResponse>("/auth/dashboard-redirect");
  return data.redirect_url;
}
