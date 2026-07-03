import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Customer } from "@/modules/customers/types";

export class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.CUSTOMERS);
  }
}

export const customerRepository = new CustomerRepository();
