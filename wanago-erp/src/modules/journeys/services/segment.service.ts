import { segmentRepository } from "@/modules/journeys/services/segment.repository";
import type { Segment, SegmentFormData } from "@/modules/journeys/types";
import type { Lead } from "@/modules/leads/types";
import type { Customer } from "@/modules/customers/types";
import type { CustomerSegment } from "@/modules/customers/utils/segment";

export async function fetchSegments(): Promise<Segment[]> {
  return segmentRepository.findMany();
}

export async function createSegment(data: SegmentFormData, createdBy: string): Promise<Segment> {
  return segmentRepository.create({ ...data, createdBy, status: "active" });
}

export async function updateSegment(id: string, data: Partial<SegmentFormData>): Promise<void> {
  return segmentRepository.update(id, data);
}

export async function deleteSegment(id: string): Promise<void> {
  return segmentRepository.delete(id);
}

export type SegmentMember =
  | { entityType: "lead"; entity: Lead }
  | { entityType: "customer"; entity: Customer };

// Pure filter over already-fetched arrays — segment membership is always
// computed live from `filters`, never stored, so a segment can't go stale.
// customerSegments must be precomputed by the caller (computeCustomerSegments
// in customers/utils/segment.ts) since it needs Leads+Bookings this
// function doesn't otherwise touch.
export function resolveSegmentMembers(
  segment: Segment,
  data: { leads: Lead[]; customers: Customer[]; customerSegments: Record<string, CustomerSegment> }
): SegmentMember[] {
  const { filters } = segment;
  const members: SegmentMember[] = [];

  if (segment.entityType === "lead" || segment.entityType === "both") {
    for (const lead of data.leads) {
      if (filters.destinationIn?.length && !filters.destinationIn.includes(lead.destination)) continue;
      if (filters.sourceIn?.length && !(lead.source && filters.sourceIn.includes(lead.source))) continue;
      members.push({ entityType: "lead", entity: lead });
    }
  }

  if (segment.entityType === "customer" || segment.entityType === "both") {
    for (const customer of data.customers) {
      if (filters.sourceIn?.length && !filters.sourceIn.includes(customer.source)) continue;
      if (filters.customerSegmentIn?.length) {
        const seg = data.customerSegments[customer.id];
        if (!seg || !filters.customerSegmentIn.includes(seg)) continue;
      }
      if (filters.cityContains) {
        const haystack = `${customer.city ?? ""} ${customer.address ?? ""}`.toLowerCase();
        if (!haystack.includes(filters.cityContains.toLowerCase())) continue;
      }
      members.push({ entityType: "customer", entity: customer });
    }
  }

  return members;
}
