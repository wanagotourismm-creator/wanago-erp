import { vendorRateRepository } from "@/modules/vendor-portal/services/vendor-rate.repository";
import { vendorAvailabilityRepository } from "@/modules/vendor-portal/services/vendor-availability.repository";
import type {
  VendorRate, VendorRateFormData,
  VendorAvailability, VendorAvailabilityFormData,
} from "@/modules/vendor-portal/types";

// ── Rates ────────────────────────────────────────────────────
export async function fetchVendorRates(): Promise<VendorRate[]> {
  return vendorRateRepository.findMany();
}
export async function createVendorRate(data: VendorRateFormData & { supplierName: string }, createdBy: string): Promise<VendorRate> {
  return vendorRateRepository.create({ ...data, createdBy, status: "active" });
}
export async function updateVendorRate(id: string, data: Partial<VendorRateFormData>): Promise<void> {
  return vendorRateRepository.update(id, data);
}
export async function deleteVendorRate(id: string): Promise<void> {
  return vendorRateRepository.delete(id);
}

// ── Availability ─────────────────────────────────────────────
export async function fetchVendorAvailability(): Promise<VendorAvailability[]> {
  return vendorAvailabilityRepository.findMany();
}
export async function createVendorAvailability(data: VendorAvailabilityFormData & { supplierName: string }, createdBy: string): Promise<VendorAvailability> {
  return vendorAvailabilityRepository.create({ ...data, createdBy, status: "active" });
}
export async function updateVendorAvailability(id: string, data: Partial<VendorAvailabilityFormData>): Promise<void> {
  return vendorAvailabilityRepository.update(id, data);
}
export async function deleteVendorAvailability(id: string): Promise<void> {
  return vendorAvailabilityRepository.delete(id);
}
