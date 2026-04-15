export const updateTrackingKeys = {
  all: ['update-tracking'] as const,
  list: (params?: Record<string, unknown>) =>
    params ? ([...updateTrackingKeys.all, 'list', params] as const) : ([...updateTrackingKeys.all, 'list'] as const),
  detail: (id: number | string) => [...updateTrackingKeys.all, 'detail', id] as const,
  stats: () => [...updateTrackingKeys.all, 'stats'] as const,
  memberStats: (userId: number) => [...updateTrackingKeys.all, 'member-stats', userId] as const,
  monthlyUpdates: (year: number, month: number, userId: number) =>
    [...updateTrackingKeys.all, 'monthly-updates', year, month, userId] as const,
  page: (month: number, year: number) => [...updateTrackingKeys.all, 'page', month, year] as const,
}
