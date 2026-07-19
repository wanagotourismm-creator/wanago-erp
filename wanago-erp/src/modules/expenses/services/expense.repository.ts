import { BaseRepository } from "@/lib/firebase/repository";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Expense } from "@/modules/expenses/types";
import { expenseDocumentSchema } from "@/modules/expenses/schemas/document";

export class ExpenseRepository extends BaseRepository<Expense> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.EXPENSES, expenseDocumentSchema);
  }
}

export const expenseRepository = new ExpenseRepository();
