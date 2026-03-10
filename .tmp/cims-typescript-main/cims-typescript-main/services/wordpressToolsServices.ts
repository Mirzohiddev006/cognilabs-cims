import api from "@/lib/api";

export interface SiteStatusResponse {
  is_site_on: boolean;
  message: string;
}

export interface WordPressDashboardResponse {
  site_status: boolean;
  permissions: string[];
  projects: Array<{
    id: number;
    name: string;
    url: string;
    description: string;
    is_active: boolean;
  }>;
  statistics: Record<string, unknown>;
}

export interface ToggleSitePayload {
  action: "toggle";
}

export interface WordPressProjectResponse {
  id: number;
  name: string;
  url: string;
  description: string;
  is_active: boolean;
}

export async function fetchWordPressDashboard(): Promise<WordPressDashboardResponse> {
  const { data } = await api.get<WordPressDashboardResponse>(
    "/wordpress/dashboard",
  );
  return data;
}

export async function fetchSiteStatus(): Promise<SiteStatusResponse> {
  const { data } = await api.get<SiteStatusResponse>("/wordpress/site-status");
  return data;
}

export async function toggleSiteStatus(): Promise<SiteStatusResponse> {
  const payload: ToggleSitePayload = { action: "toggle" };
  const { data } = await api.post<SiteStatusResponse>(
    "/wordpress/toggle-site",
    payload,
  );
  return data;
}

export async function toggleProjectActive(
  projectId: number,
): Promise<WordPressProjectResponse> {
  const { data } = await api.patch<WordPressProjectResponse>(
    `/wordpress/projects/${projectId}/toggle-active`,
  );
  return data;
}
