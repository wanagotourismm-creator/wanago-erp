import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Form } from "@/modules/forms/types";

export class FormRepository extends BaseRepository<Form> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.FORMS);
  }
}

export const formRepository = new FormRepository();
