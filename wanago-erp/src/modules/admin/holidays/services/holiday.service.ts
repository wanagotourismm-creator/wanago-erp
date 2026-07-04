import { orderBy } from "firebase/firestore";
import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Holiday, HolidayFormData } from "@/modules/admin/holidays/types";

class HolidayRepository extends BaseRepository<Holiday> {
  constructor() { super(FIRESTORE_COLLECTIONS.HOLIDAYS); }
}
const repo = new HolidayRepository();

export async function fetchHolidays(): Promise<Holiday[]> {
  return repo.findMany({ constraints: [orderBy("date", "asc")] });
}

export async function createHoliday(data: HolidayFormData, createdBy: string): Promise<Holiday> {
  return repo.create({ ...data, createdBy, status: "active" });
}

export async function deleteHoliday(id: string): Promise<void> {
  return repo.delete(id);
}
