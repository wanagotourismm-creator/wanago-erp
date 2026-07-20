import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Segment } from "@/modules/journeys/types";

export class SegmentRepository extends BaseRepository<Segment> {
  constructor() { super(FIRESTORE_COLLECTIONS.SEGMENTS); }
}

export const segmentRepository = new SegmentRepository();
