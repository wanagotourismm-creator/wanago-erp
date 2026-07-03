// ─────────────────────────────────────────────────
// WANAGO ERP — Global Shared Types
// ─────────────────────────────────────────────────

export type Timestamp = {
  seconds: number;
  nanoseconds: number;
};

export type FirestoreRecord = {
  id: string;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  createdBy: string;
  status: string;
};

export type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
};

export type SortState = {
  field: string;
  direction: "asc" | "desc";
};

export type FilterState = Record<string, string | string[] | boolean | null>;

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type Office = {
  id: string;
  name: string;
  code: string;
};
