import { create } from "zustand";
import { getCanonicalCRMStatusValue } from "@/lib/crm-statuses";
import {
  getClients,
  addClient as apiAddClient,
  updateClient as apiUpdateClient,
  deleteClient as apiDeleteClient,
  type Client,
} from "@/services/clientServices";

interface FilterState {
  search: string;
  status: string | null;
  platform: string | null;
  dateRange: { start: string; end?: string } | null;
  phoneNumber: string;
  show_all: boolean;
}

interface ClientStore {
  clients: Client[];
  filteredClients: Client[];
  loading: boolean;
  error: string | null;
  filters: FilterState;

  // Actions
  fetchClients: () => Promise<void>;
  addClient: (
    client: FormData | Omit<Client, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  updateClient: (
    id: string | number,
    client: FormData | Partial<Client>,
  ) => Promise<void>;
  deleteClient: (id: string | number) => Promise<void>;
  clearError: () => void;

  setSearch: (search: string) => Promise<void>;
  setStatusFilter: (status: string | null) => Promise<void>;
  setPlatformFilter: (platform: string | null) => Promise<void>;
  setDateFilter: (start: string, end?: string) => Promise<void>;
  setPhoneFilter: (phone: string) => Promise<void>;
  clearFilters: () => Promise<void>;
}

// Helper function to safely get URL parameters (client-side only)
const getUrlParam = (param: string): string | null => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(param);
};

// Helper function to safely update URL (client-side only)
const updateUrl = (searchParams?: URLSearchParams) => {
  if (typeof window === "undefined") return;
  const newUrl = searchParams
    ? `${window.location.pathname}?${searchParams}`
    : window.location.pathname;
  window.history.pushState({}, "", newUrl);
};

const toComparableDate = (value?: string) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
};

const applyClientFilters = (clients: Client[], filters: FilterState) => {
  const searchValue = filters.search.trim().toLowerCase();
  const phoneValue = filters.phoneNumber.trim();
  const selectedStatus = getCanonicalCRMStatusValue(filters.status);

  return clients.filter((client) => {
    if (searchValue) {
      const matchesSearch =
        client.full_name.toLowerCase().includes(searchValue) ||
        client.username?.toLowerCase().includes(searchValue);

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

    if (filters.dateRange?.start) {
      const clientDate = toComparableDate(client.created_at);
      if (!clientDate) {
        return false;
      }

      if (filters.dateRange.end) {
        return (
          clientDate >= filters.dateRange.start &&
          clientDate <= filters.dateRange.end
        );
      }

      return clientDate === filters.dateRange.start;
    }

    return true;
  });
};

const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  filteredClients: [],
  loading: false,
  error: null,
  filters: {
    search: getUrlParam("search") || "",
    status: getCanonicalCRMStatusValue(getUrlParam("status_filter")),
    platform: null,
    dateRange: null,
    phoneNumber: "",
    show_all: getUrlParam("show_all") === "true",
  },

  fetchClients: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getClients();
      const filters = get().filters;
      set({ clients: data, filteredClients: applyClientFilters(data, filters) });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch clients",
      });
    } finally {
      set({ loading: false });
    }
  },

  addClient: async (client) => {
    set({ loading: true, error: null });
    try {
      await apiAddClient(client);
      const updatedClients = await getClients();
      set({
        clients: updatedClients,
        filteredClients: updatedClients,
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
      });
      updateUrl();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to add client",
        loading: false,
      });
      throw err;
    }
  },

  updateClient: async (id, client) => {
    set({ loading: true, error: null });
    try {
      await apiUpdateClient(id, client);
      const updatedClients = await getClients();
      set({
        clients: updatedClients,
        filteredClients: updatedClients,
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
      });
      updateUrl();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to update client",
        loading: false,
      });
      throw err;
    }
  },

  deleteClient: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiDeleteClient(id);
      const updatedClients = await getClients();
      set({
        clients: updatedClients,
        filteredClients: updatedClients,
        filters: {
          search: "",
          status: null,
          platform: null,
          dateRange: null,
          phoneNumber: "",
          show_all: false,
        },
      });
      updateUrl();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to delete client",
        loading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  setSearch: async (search) => {
    const searchParams = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    if (search) {
      searchParams.set("search", search);
    } else {
      searchParams.delete("search");
    }
    updateUrl(searchParams);

    set((state) => {
      const filters = { ...state.filters, search };
      return {
        filters,
        filteredClients: applyClientFilters(state.clients, filters),
        error: null,
      };
    });
  },

  setStatusFilter: async (status) => {
    const normalizedStatus = getCanonicalCRMStatusValue(status);
    const searchParams = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    if (normalizedStatus) {
      searchParams.set("status_filter", normalizedStatus);
    } else {
      searchParams.delete("status_filter");
    }
    updateUrl(searchParams);

    set((state) => {
      const filters = { ...state.filters, status: normalizedStatus || null };
      return {
        filters,
        filteredClients: applyClientFilters(state.clients, filters),
        error: null,
      };
    });
  },

  setPlatformFilter: async (platform) => {
    set((state) => {
      const filters = { ...state.filters, platform };
      return {
        filters,
        filteredClients: applyClientFilters(state.clients, filters),
        error: null,
      };
    });
  },

  setDateFilter: async (start, end) => {
    set((state) => {
      const filters = {
        ...state.filters,
        dateRange: start ? { start, end } : null,
      };
      return {
        filters,
        filteredClients: applyClientFilters(state.clients, filters),
        error: null,
      };
    });
  },

  setPhoneFilter: async (phone) => {
    set((state) => {
      const filters = { ...state.filters, phoneNumber: phone };
      return {
        filters,
        filteredClients: applyClientFilters(state.clients, filters),
        error: null,
      };
    });
  },

  clearFilters: async () => {
    updateUrl();
    set({
      filters: {
        search: "",
        status: null,
        platform: null,
        dateRange: null,
        phoneNumber: "",
        show_all: false,
      },
    });
    const { clients } = get();
    set({ filteredClients: clients });
  },
}));

export default useClientStore;
