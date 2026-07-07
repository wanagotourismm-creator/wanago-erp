import { fetchUsers } from "@/modules/admin/users/services/user-admin.service";
import { hasPermission } from "@/lib/rbac";
import type { Permission } from "@/types/rbac";
import type { UserProfile } from "@/modules/auth/types";

// Who should be notified when something needs a specific permission's
// holder to act on it (e.g. "bookings:finance_approve" -> every active
// Finance/Admin user).
export async function fetchUsersByPermission(permission: Permission): Promise<UserProfile[]> {
  const users = await fetchUsers();
  return users.filter((u) => u.isActive && hasPermission(u.systemRole, permission));
}

export async function fetchUserById(uid: string): Promise<UserProfile | null> {
  const users = await fetchUsers();
  return users.find((u) => u.id === uid || u.uid === uid) ?? null;
}
