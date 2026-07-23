import { resourceRepository } from "@/modules/resources/services/resource.repository";
import { resourceAssignmentRepository } from "@/modules/resources/services/resource-assignment.repository";
import { resourceBlackoutRepository } from "@/modules/resources/services/resource-blackout.repository";
import type {
  Resource, ResourceFormData,
  ResourceAssignment, ResourceAssignmentFormData,
  ResourceBlackout, ResourceBlackoutFormData,
} from "@/modules/resources/types";

// ── Resources ────────────────────────────────────────────────
export async function fetchResources(): Promise<Resource[]> {
  return resourceRepository.findMany();
}
export async function createResource(data: ResourceFormData, createdBy: string): Promise<Resource> {
  return resourceRepository.create({ ...data, createdBy, status: "active" });
}
export async function updateResource(id: string, data: Partial<ResourceFormData>): Promise<void> {
  return resourceRepository.update(id, data);
}
export async function deleteResource(id: string): Promise<void> {
  return resourceRepository.delete(id);
}

// ── Assignments ──────────────────────────────────────────────
export async function fetchResourceAssignments(): Promise<ResourceAssignment[]> {
  return resourceAssignmentRepository.findMany();
}
export async function createResourceAssignment(data: ResourceAssignmentFormData, createdBy: string): Promise<ResourceAssignment> {
  return resourceAssignmentRepository.create({ ...data, createdBy, status: "active" });
}
export async function updateResourceAssignment(id: string, data: Partial<ResourceAssignmentFormData>): Promise<void> {
  return resourceAssignmentRepository.update(id, data);
}
export async function deleteResourceAssignment(id: string): Promise<void> {
  return resourceAssignmentRepository.delete(id);
}

// ── Blackouts ────────────────────────────────────────────────
export async function fetchResourceBlackouts(): Promise<ResourceBlackout[]> {
  return resourceBlackoutRepository.findMany();
}
export async function createResourceBlackout(data: ResourceBlackoutFormData, createdBy: string): Promise<ResourceBlackout> {
  return resourceBlackoutRepository.create({ ...data, createdBy, status: "active" });
}
export async function updateResourceBlackout(id: string, data: Partial<ResourceBlackoutFormData>): Promise<void> {
  return resourceBlackoutRepository.update(id, data);
}
export async function deleteResourceBlackout(id: string): Promise<void> {
  return resourceBlackoutRepository.delete(id);
}
