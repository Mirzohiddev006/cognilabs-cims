import api from "@/lib/api";
import { getCanonicalCRMStatusValue } from "@/lib/crm-statuses";

export interface BackendClient {
  id: number;
  full_name: string;
  platform: string;
  username: string | null;
  phone_number: string;
  status: string;
  assistant_name: string | null;
  notes: string | null;
  recall_time?: string | null;
  customer_type?: string | null;
  conversation_language: string | null;
  aisummary?: string | null;
  audio: string | null;
  audio_file_id: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Client {
  id: number | string;
  full_name: string;
  username: string | null;
  platform: string;
  phone_number: string;
  status: string;
  assistant_name: string | null;
  notes: string | null;
  recall_time?: string | null;
  customer_type?: string | null;
  conversation_language: string | null;
  aisummary?: string | null;
  audio: string | null;
  audio_file_id: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerStatusChoice {
  value: string;
  label: string;
}

export interface CrmStatsResponse {
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

export interface DashboardResponse extends Partial<CrmStatsResponse> {
  customers?: BackendClient[];
  sales?: BackendClient[];
  status_stats?: Record<string, number>;
  status_choices?: CustomerStatusChoice[];
  permissions?: string[];
  selected_status?: string | null;
  period_stats?: Record<string, number>;
}

export interface CrmDashboardResponse {
  customers: Client[];
  status_stats: Record<string, number>;
  status_dict: Record<string, number>;
  status_percentages: Record<string, number>;
  status_choices: CustomerStatusChoice[];
  permissions: string[];
  selected_status: string | null;
  period_stats: Record<string, number>;
}

export interface CustomerApiCreatePayload {
  assistant_name?: string | null;
  conversation_language?: string | null;
  full_name: string;
  notes?: string | null;
  phone_number: string;
  platform: string;
  status: string;
  username?: string | null;
}

export interface CustomerListFilters {
  search?: string;
  status?: string;
  platform?: string;
  phone?: string;
  date_from?: string;
  date_to?: string;
  show_all?: boolean;
}

export interface CrmDashboardParams {
  search?: string;
  status_filter?: string;
  show_all?: boolean;
}

export type CrmStatsPeriodResponse = unknown;

interface CreateResponse {
  message: string;
  id: number;
}

interface SuccessResponse {
  message: string;
}

const transformBackendToFrontend = (backend: BackendClient): Client => ({
  id: backend.id,
  full_name: backend.full_name,
  username: backend.username,
  platform: backend.platform,
  phone_number: backend.phone_number,
  status: backend.status,
  assistant_name: backend.assistant_name,
  notes: backend.notes,
  recall_time: backend.recall_time ?? null,
  customer_type: backend.customer_type ?? null,
  conversation_language: backend.conversation_language,
  aisummary: backend.aisummary ?? null,
  audio: backend.audio,
  audio_file_id: backend.audio_file_id,
  audio_url: backend.audio_url,
  created_at: backend.created_at,
  updated_at: backend.updated_at ?? backend.created_at,
});

const extractCustomers = (data: unknown): BackendClient[] => {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data as BackendClient[];
  }

  if (typeof data !== "object") {
    return [];
  }

  const payload = data as DashboardResponse;

  if (Array.isArray(payload.customers)) {
    return payload.customers;
  }

  if (Array.isArray(payload.sales)) {
    return payload.sales;
  }

  return [];
};

const clampLimit = (limit: number, min = 1, max = 500) =>
  Math.min(Math.max(Number.isFinite(limit) ? limit : min, min), max);

const toComparableDate = (value?: string) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
};

const applyLocalCustomerFilters = (
  clients: Client[],
  filters?: CustomerListFilters,
) => {
  if (!filters) {
    return clients;
  }

  const searchValue = filters.search?.trim().toLowerCase();
  const phoneValue = filters.phone?.trim();
  const selectedStatus = getCanonicalCRMStatusValue(filters.status);

  return clients.filter((client) => {
    if (searchValue) {
      const matchesSearch =
        client.full_name.toLowerCase().includes(searchValue) ||
        client.username?.toLowerCase().includes(searchValue) ||
        client.phone_number.toLowerCase().includes(searchValue);

      if (!matchesSearch) {
        return false;
      }
    }

    if (
      selectedStatus &&
      getCanonicalCRMStatusValue(client.status) !== selectedStatus
    ) {
      return false;
    }

    if (filters.platform && client.platform !== filters.platform) {
      return false;
    }

    if (phoneValue && !client.phone_number.includes(phoneValue)) {
      return false;
    }

    if (filters.date_from) {
      const clientDate = toComparableDate(client.created_at);
      if (!clientDate) {
        return false;
      }

      if (filters.date_to) {
        return clientDate >= filters.date_from && clientDate <= filters.date_to;
      }

      return clientDate === filters.date_from;
    }

    return true;
  });
};

const isBackendClient = (value: unknown): value is BackendClient =>
  Boolean(
    value &&
      typeof value === "object" &&
      "full_name" in value &&
      "phone_number" in value &&
      "platform" in value,
  );

const hasCreateResponseId = (value: unknown): value is CreateResponse =>
  Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      typeof (value as { id?: unknown }).id === "number",
  );

export const getLatestCustomers = async (limit = 50): Promise<Client[]> => {
  const safeLimit = clampLimit(limit);
  const { data } = await api.get<BackendClient[]>(
    `/crm/customers/latest?limit=${safeLimit}`,
  );
  return extractCustomers(data).map(transformBackendToFrontend);
};

export const getCustomerDetail = async (
  customerId: number | string,
): Promise<Client> => {
  const { data } = await api.get<BackendClient>(`/crm/detail/${customerId}`);
  return transformBackendToFrontend(data);
};

export const getBasicCustomers = async (limit = 50): Promise<Client[]> => {
  const safeLimit = clampLimit(limit);
  const { data } = await api.get<BackendClient[]>(
    `/crm/customers/bazakorinish?limit=${safeLimit}`,
  );
  return extractCustomers(data).map(transformBackendToFrontend);
};

export const getCrmDashboard = async (
  params?: CrmDashboardParams,
): Promise<CrmDashboardResponse> => {
  const query = new URLSearchParams();

  if (params?.search) {
    query.set("search", params.search);
  }

  if (params?.status_filter) {
    query.set("status_filter", params.status_filter);
  }

  if (params?.show_all !== undefined) {
    query.set("show_all", String(params.show_all));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const { data } = await api.get<DashboardResponse>(`/crm/dashboard${suffix}`);

  return {
    customers: extractCustomers(data).map(transformBackendToFrontend),
    status_stats: data.status_stats ?? {},
    status_dict: data.status_dict ?? {},
    status_percentages: data.status_percentages ?? {},
    status_choices: data.status_choices ?? [],
    permissions: data.permissions ?? [],
    selected_status: data.selected_status ?? null,
    period_stats: data.period_stats ?? {},
  };
};

export const getCrmStatsPeriod = async (): Promise<CrmStatsPeriodResponse> => {
  const { data } = await api.get<CrmStatsPeriodResponse>("/crm/stats/period");
  return data;
};

export const getCrmStats = async (): Promise<CrmStatsResponse> => {
  const { data } = await api.get<CrmStatsResponse>("/crm/stats");
  return {
    total_customers: data.total_customers ?? 0,
    need_to_call: data.need_to_call ?? 0,
    contacted: data.contacted ?? 0,
    project_started: data.project_started ?? 0,
    continuing: data.continuing ?? 0,
    finished: data.finished ?? 0,
    rejected: data.rejected ?? 0,
    status_dict: data.status_dict ?? {},
    status_percentages: data.status_percentages ?? {},
  };
};

export const bulkDeleteCustomers = async (
  customerIds: Array<number | string>,
): Promise<{ message: string }> => {
  const { data } = await api.delete<{ message: string }>(
    "/crm/customers/bulk-delete",
    {
      data: {
        customer_ids: customerIds.map((id) => Number(id)),
      },
    },
  );

  return data;
};

export const createCustomerViaApi = async (
  payload: CustomerApiCreatePayload,
): Promise<{ message: string; id: number }> => {
  const { data } = await api.post<{ message: string; id: number }>(
    "/crm/api/customers",
    payload,
  );
  return data;
};

export const getCustomerAudioUrl = (fileId: string) =>
  `${api.defaults.baseURL}/crm/customers/audio/${encodeURIComponent(fileId)}`;

export const getCustomerAudioBlob = async (fileId: string): Promise<Blob> => {
  const { data } = await api.get<Blob>(
    `/crm/customers/audio/${encodeURIComponent(fileId)}`,
    {
      responseType: "blob",
    },
  );

  return data;
};

export const getClients = async (
  filters?: CustomerListFilters,
): Promise<Client[]> => {
  try {
    const clients = await getLatestCustomers(500);
    return applyLocalCustomerFilters(clients, filters);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};

export const searchClients = async (
  query: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    const normalizedQuery = query.toLowerCase();
    return existingClients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(normalizedQuery) ||
        client.username?.toLowerCase().includes(normalizedQuery),
    );
  }

  return getClients({ search: query });
};

export const filterClientsByStatus = async (
  status: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    const selectedStatus = getCanonicalCRMStatusValue(status);
    return existingClients.filter(
      (client) => getCanonicalCRMStatusValue(client.status) === selectedStatus,
    );
  }

  const clients = await getClients();
  const selectedStatus = getCanonicalCRMStatusValue(status);
  return clients.filter(
    (client) => getCanonicalCRMStatusValue(client.status) === selectedStatus,
  );
};

export const filterClientsByPlatform = async (
  platform: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) => client.platform === platform);
  }

  try {
    const { data } = await api.get<BackendClient[]>(
      `/crm/customers/filter/platform?platform=${encodeURIComponent(platform)}`,
    );

    return extractCustomers(data).map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};

export const filterClientsByDate = async (
  startDate: string,
  endDate?: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return applyLocalCustomerFilters(existingClients, {
      date_from: startDate,
      date_to: endDate,
    });
  }

  try {
    let url = `/crm/customers/filter/date?start_date=${encodeURIComponent(startDate)}`;
    if (endDate) {
      url += `&end_date=${encodeURIComponent(endDate)}`;
    }

    const { data } = await api.get<BackendClient[]>(url);
    return extractCustomers(data).map(transformBackendToFrontend);
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};

export const searchClientsByPhone = async (
  phone: string,
  existingClients?: Client[],
): Promise<Client[]> => {
  if (existingClients) {
    return existingClients.filter((client) =>
      client.phone_number.includes(phone),
    );
  }

  return getClients({ search: phone, phone });
};

export const addClient = async (
  data: FormData | Omit<Client, "id" | "created_at" | "updated_at">,
): Promise<Client> => {
  let formData: FormData;

  if (data instanceof FormData) {
    formData = data;
  } else {
    if (!data.full_name?.trim()) {
      throw new Error("Full name is required");
    }
    if (!data.platform?.trim()) {
      throw new Error("Platform is required");
    }
    if (!data.phone_number?.trim()) {
      throw new Error("Phone number is required");
    }
    if (!data.status?.trim()) {
      throw new Error("Status is required");
    }

    formData = new FormData();
    formData.append("full_name", data.full_name.trim());
    formData.append("platform", data.platform.trim());
    formData.append("phone_number", data.phone_number.trim());
    formData.append("status", data.status.trim());
    formData.append(
      "username",
      data.username || data.full_name.toLowerCase().replace(/\s+/g, "."),
    );
    formData.append("notes", data.notes || "");
    formData.append("assistant_name", data.assistant_name || "");
    if (data.recall_time) {
      formData.append("recall_time", data.recall_time);
    }
    if (data.customer_type) {
      formData.append("customer_type", data.customer_type);
    }
    formData.append("conversation_language", data.conversation_language || "");

    if (data.audio) {
      formData.append("audio", data.audio);
    }
  }

  try {
    const { data: response } = await api.post<BackendClient | CreateResponse>(
      "/crm/customers",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    if (isBackendClient(response)) {
      return transformBackendToFrontend(response);
    }

    if (hasCreateResponseId(response)) {
      return getCustomerDetail(response.id);
    }

    throw new Error("Unexpected create customer response");
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to create client");
  }
};

export const updateClient = async (
  id: string | number,
  data: FormData | Partial<Client>,
): Promise<Client> => {
  let formData: FormData;

  if (data instanceof FormData) {
    if (data.has("status")) {
      const value = data.get("status");
      data.delete("status");
      if (value) {
        data.append("customer_status", String(value));
      }
    }
    formData = data;
  } else {
    if (data.full_name !== undefined && !data.full_name.trim()) {
      throw new Error("Full name cannot be empty");
    }
    if (data.platform !== undefined && !data.platform.trim()) {
      throw new Error("Platform cannot be empty");
    }

    formData = new FormData();
    if (data.full_name) {
      formData.append("full_name", data.full_name.trim());
    }
    if (data.platform) {
      formData.append("platform", data.platform.trim());
    }
    if (data.phone_number) {
      formData.append("phone_number", data.phone_number.trim());
    }
    if (data.status) {
      formData.append("customer_status", data.status);
    }
    if (data.username) {
      formData.append("username", data.username.trim());
    }
    if (data.notes !== undefined) {
      formData.append("notes", data.notes || "");
    }
    if (data.assistant_name !== undefined) {
      formData.append("assistant_name", data.assistant_name || "");
    }
    if (data.recall_time !== undefined) {
      if (data.recall_time) {
        formData.append("recall_time", data.recall_time);
      } else {
        formData.append("clear_recall_time", "true");
      }
    }
    if (data.conversation_language !== undefined) {
      formData.append(
        "conversation_language",
        data.conversation_language || "",
      );
    }
    if (data.audio) {
      formData.append("audio", data.audio as string | Blob);
    }
  }

  const { data: response } = await api.put<BackendClient | SuccessResponse>(
    `/crm/customers/${id}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  if (isBackendClient(response)) {
    return transformBackendToFrontend(response);
  }

  return getCustomerDetail(id);
};

export const patchClient = async (
  id: string | number,
  data: FormData | Partial<Client>,
): Promise<Client> => {
  let formData: FormData;

  if (data instanceof FormData) {
    if (data.has("status")) {
      const value = data.get("status");
      data.delete("status");
      if (value) {
        data.append("customer_status", String(value));
      }
    }
    formData = data;
  } else {
    formData = new FormData();

    if (data.full_name !== undefined) {
      formData.append("full_name", data.full_name.trim());
    }
    if (data.platform !== undefined) {
      formData.append("platform", data.platform.trim());
    }
    if (data.phone_number !== undefined) {
      formData.append("phone_number", data.phone_number.trim());
    }
    if (data.status !== undefined) {
      formData.append("customer_status", data.status);
    }
    if (data.username !== undefined) {
      formData.append("username", data.username?.trim() || "");
    }
    if (data.assistant_name !== undefined) {
      formData.append("assistant_name", data.assistant_name || "");
    }
    if (data.notes !== undefined) {
      formData.append("notes", data.notes || "");
    }
    if (data.recall_time !== undefined) {
      if (data.recall_time) {
        formData.append("recall_time", data.recall_time);
      } else {
        formData.append("clear_recall_time", "true");
      }
    }
    if (data.conversation_language !== undefined) {
      formData.append(
        "conversation_language",
        data.conversation_language || "",
      );
    }
    if (data.audio) {
      formData.append("audio", data.audio as string | Blob);
    }
  }

  const { data: response } = await api.patch<BackendClient | SuccessResponse>(
    `/crm/customers/${id}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  if (isBackendClient(response)) {
    return transformBackendToFrontend(response);
  }

  return getCustomerDetail(id);
};

export const deleteClient = async (id: string | number): Promise<void> => {
  await api.delete(`/crm/customers/${id}`);
};
