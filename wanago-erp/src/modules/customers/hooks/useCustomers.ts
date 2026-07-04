"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCustomers, createCustomer, updateCustomer, deleteCustomer,
} from "@/modules/customers/services/customer.service";
import { useAuthStore } from "@/store/auth.store";
import type { Customer, CustomerFormData } from "@/modules/customers/types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const { user } = useAuthStore();

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
      await deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      return { error: null };
    } catch {
      return { error: "Failed to delete customer" };
    }
  }

  return { customers, loading, error, load, addCustomer, editCustomer, removeCustomer };
}
