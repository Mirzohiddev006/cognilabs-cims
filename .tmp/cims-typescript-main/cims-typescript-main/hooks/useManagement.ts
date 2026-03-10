"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchRoles,
  fetchStatuses,
  type ManagementRole,
  type ManagementStatus,
} from "@/services/managementServices";

export function useStatuses() {
  return useQuery<ManagementStatus[]>({
    queryKey: ["management", "statuses"],
    queryFn: fetchStatuses,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoles() {
  return useQuery<ManagementRole[]>({
    queryKey: ["management", "roles"],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000,
  });
}
