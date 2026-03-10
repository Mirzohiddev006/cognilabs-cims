import api from "@/lib/api";
import { CRM_STATUS_DEFINITIONS } from "@/lib/crm-statuses";

export interface ManagementStatus {
  id: number;
  name: string;
  display_name: string;
  description: string;
  color: string;
  order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagementRole {
  id: number;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchStatuses(): Promise<ManagementStatus[]> {
  return CRM_STATUS_DEFINITIONS.map((status, index) => ({
    id: index + 1,
    name: status.value,
    display_name: status.label,
    description: status.description,
    color: status.color,
    order: status.order,
    is_active: true,
    is_system: true,
    created_at: "2026-03-06T00:00:00.000Z",
    updated_at: "2026-03-06T00:00:00.000Z",
  }));
}

export async function fetchRoles(): Promise<ManagementRole[]> {
  const { data } = await api.get<ManagementRole[]>("/management/roles");
  return data.filter((role) => role.is_active);
}
