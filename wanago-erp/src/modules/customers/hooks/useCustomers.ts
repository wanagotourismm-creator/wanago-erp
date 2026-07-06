"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchCustomers, createCustomer, updateCustomer, deleteCustomer,
} from "@/modules/customers/services/customer.service";
import { useAuthStore } from "@/store/auth.store";
import { useCurrentEmployee } from "@/modules/dashboard/hooks/useCurrentEmployee";
import { scopeByAssignee } from "@/lib/rbac-scope";
import { logActivity } from "@/lib/activity-log";
import type { Customer, CustomerFormData } from "@/modules/customers/types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const { user } = useAuthStore();
  const { employee } = useCurrentEmployee();

  // A `sales` user only sees customers assigned to them; every other role
  // (including sales_head) sees the full unfiltered list.
  const scopedCustomers = useMemo(
    () => scopeByAssignee(customers, user?.systemRole ?? "sales", employee?.id ?? null),
    [customers, user?.systemRole, employee?.id]
  );

  const load = useCallback(async (filters?: { customerType?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers(filters);
      setCustomers(data);
    } catch {
      setError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCustomer(data: CustomerFormData): Promise<{ error: string | null }> {
    try {
      const customer = await createCustomer(data, user?.uid ?? "");
      setCustomers(prev => [customer, ...prev]);
      logActivity({
        entityType: "Customer", entityName: customer.fullName, action: "created",
        detail: `Added customer ${customer.refNumber}`,
        actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
      });
      return { error: null };
    } catch {
      return { error: "Failed to create customer" };
    }
  }

  async function editCustomer(
    id: string, data: Partial<CustomerFormData>
  ): Promise<{ error: string | null }> {
    try {
      await updateCustomer(id, data);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      return { error: null };
    } catch {
      return { error: "Failed to update customer" };
    }
  }

  async function removeCustomer(id: string): Promise<{ error: string | null }> {
    try {
      const customer = customers.find(c => c.id === id);
      await deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      if (customer) {
        logActivity({
          entityType: "Customer", entityName: customer.fullName, action: "deleted",
          detail: `Deleted customer ${customer.refNumber}`,
          actorId: user?.uid ?? "", actorName: user?.displayName ?? "Unknown",
        });
      }
      return { error: null };
    } catch {
      return { error: "Failed to delete customer" };
    }
  }

  return { customers: scopedCustomers, loading, error, load, addCustomer, editCustomer, removeCustomer };
}
