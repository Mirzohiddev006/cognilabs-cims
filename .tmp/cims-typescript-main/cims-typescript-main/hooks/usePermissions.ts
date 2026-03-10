  // hooks/usePermissions.ts
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
  import api from "@/lib/api" // your axios/fetch wrapper
  
  // Match the backend structure exactly
  type Permissions = {
    ceo: boolean
    payment_list: boolean
    project_toggle: boolean
    crm: boolean
    finance_list: boolean
    update_list: boolean
  }
  
  async function fetchPermissions(userId: string): Promise<Permissions> {
    const { data } = await api.get(`/ceo/users/${userId}/permissions`);
    return data.permissions; // ✅ correct
  }

  
  async function updatePermissions(userId: string, permissions: Permissions): Promise<Permissions> {
    const { data } = await api.put(`/ceo/users/${userId}/permissions`, permissions)
    return data
  }
  
  export function usePermissions(userId: string) {
    const queryClient = useQueryClient()
  
    const permissionsQuery = useQuery({
      queryKey: ["permissions", userId],
      queryFn: () => fetchPermissions(userId),
      enabled: !!userId, // only run if userId is defined
    })
  
    const permissionsMutation = useMutation({
      mutationFn: (permissions: Permissions) => updatePermissions(userId, permissions),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["permissions", userId] })
      },
    })
  
  return {
    ...permissionsQuery,
    updatePermissions: permissionsMutation.mutateAsync,
    isUpdating: permissionsMutation.isPending,
  }
}
