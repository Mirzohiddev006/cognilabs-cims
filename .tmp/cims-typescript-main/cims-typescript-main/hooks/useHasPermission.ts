// hooks/useHasPermission.ts
import { usePermissions } from "./usePermissions";

// Match your backend permission keys
type PermissionKey = "ceo" | "payment_list" | "project_toggle" | "crm" | "finance_list" | "update_list";

export function useHasPermission(
  userId: string,
  required: PermissionKey | PermissionKey[]
) {
  const { data: permissions, isLoading, isError } = usePermissions(userId);

  if (isLoading) {
    return { allowed: false, loading: true };
  }

  if (isError || !permissions) {
    return { allowed: false, loading: false };
  }

  // Convert to array if single string
  const requiredArray = Array.isArray(required) ? required : [required];

  // Since permissions is a flat object like { ceo: true, ... },
  // check if all required keys are present and truthy
  const allowed = requiredArray.every((key) => permissions[key] === true);

  return { allowed, loading: false };
}