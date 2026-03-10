// stores/useAdminStats.ts
import { create } from "zustand"
import api from "@/lib/api"

interface Customer {
  id: number
  full_name: string
  platform: string
  username: string
  phone_number: string
  status: string
  assistant_name: string
  created_at: string
}

interface BalanceData {
  uzs: number
  formatted: string
}

interface DashboardState {
  todayCustomers: Customer[]
  needToCallCount: number
  totalBalance: BalanceData
  duePaymentsToday: number
  users: any[]
  loading: boolean
  error: string | null
  lastFetched: number | null
  fetchDashboard: (force?: boolean) => Promise<void>
  updateUserInStore: (userId: string, updatedData: any) => void
  updateUserOptimistically: (userId: string, updatedData: any) => void
  reset: () => void
}

const initialState = {
  todayCustomers: [],
  needToCallCount: 0,
  totalBalance: { uzs: 0, formatted: "0.00" },
  duePaymentsToday: 0,
  users: [],
}

const STALE_TIME = 60_000 // 1 minute

const useDashboardStore = create<DashboardState>((set, get) => ({
  ...initialState,
  loading: false,
  error: null,
  lastFetched: null,

  fetchDashboard: async (force = false) => {
    const { lastFetched } = get()
    const now = Date.now()

    // ✅ Use cached data if not stale and not forced
    if (!force && lastFetched && now - lastFetched < STALE_TIME) {
      return
    }

    set({ loading: true, error: null })

    try {
      const [metricsRes, dashboardRes] = await Promise.all([
        api.get("/ceo/metrics/today"),
        api.get("/ceo/dashboard"),
      ])

      const metricsData = metricsRes.data
      const dashboardData = dashboardRes.data

      set({
        todayCustomers: Array.isArray(metricsData.today_customers) ? metricsData.today_customers : [],
        needToCallCount: metricsData.need_to_call_count ?? 0,
        totalBalance: {
          uzs: metricsData.total_balance_uzs ?? 0,
          formatted: metricsData.total_balance_formatted ?? "0.00",
        },
        duePaymentsToday: metricsData.due_payments_today ?? 0,
        users: Array.isArray(dashboardData.users) ? dashboardData.users : [],
        lastFetched: Date.now(),
      })
    } catch (e: any) {
      set({
        error:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load dashboard metrics",
      })
    } finally {
      set({ loading: false })
    }
  },

  reset: () => {
    set({
      ...initialState,
      loading: false,
      error: null,
      lastFetched: null,
    })
  },

  updateUserInStore: (userId: string, updatedData: any) => {
    set((state) => {
      const updatedUsers = state.users.map(user =>
        user.id === userId ? { ...user, ...updatedData } : user
      )
      return {
        users: updatedUsers,
      }
    })
  },

  updateUserOptimistically: (userId: string, updatedData: any) => {
    const { updateUserInStore } = get()
    updateUserInStore(userId, updatedData)
  },
}))

export default useDashboardStore