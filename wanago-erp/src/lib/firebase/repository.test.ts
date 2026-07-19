import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { BaseRepository } from "./repository";
import { firestoreRecordSchema } from "./schemas";
import type { FirestoreRecord } from "@/types/global";

vi.mock("@/lib/firebase/client", () => ({
  db: {},
  auth: { currentUser: null },
}));

const { logInvalidDocument, getDocs, getDoc } = vi.hoisted(() => ({
  logInvalidDocument: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock("@/lib/firebase/schemas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./schemas")>();
  return { ...actual, logInvalidDocument };
});

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: (...args: unknown[]) => getDocs(...args),
  getDoc: (...args: unknown[]) => getDoc(...args),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  serverTimestamp: vi.fn(),
  onSnapshot: vi.fn(),
}));

const testSchema = firestoreRecordSchema.extend({ name: z.string() });
type TestRecord = FirestoreRecord & { name: string };

class TestRepository extends BaseRepository<TestRecord> {
  constructor() {
    super("test-collection", testSchema);
  }
}

class UnvalidatedRepository extends BaseRepository<TestRecord> {
  constructor() {
    super("unvalidated-collection");
  }
}

describe("BaseRepository — Zod-validated reads", () => {
  beforeEach(() => {
    logInvalidDocument.mockClear();
    getDocs.mockReset();
    getDoc.mockReset();
  });

  it("findMany drops an invalid document and keeps the valid one", async () => {
    getDocs.mockResolvedValue({
      docs: [
        { id: "good", data: () => ({ name: "Valid Record" }) },
        { id: "bad", data: () => ({ name: 123 }) }, // wrong type — should be skipped, not thrown
      ],
    });

    const repo = new TestRepository();
    const results = await repo.findMany();

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("good");
    expect(logInvalidDocument).toHaveBeenCalledTimes(1);
    expect(logInvalidDocument).toHaveBeenCalledWith("test-collection", "bad", expect.anything());
  });

  it("findById returns null (not a throw) for a malformed document", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      id: "bad",
      data: () => ({ name: null }),
    });

    const repo = new TestRepository();
    const result = await repo.findById("bad");

    expect(result).toBeNull();
    expect(logInvalidDocument).toHaveBeenCalledTimes(1);
  });

  it("findById returns the document untouched when no schema is passed", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      id: "anything",
      data: () => ({ name: 123, anythingGoes: true }),
    });

    const repo = new UnvalidatedRepository();
    const result = await repo.findById("anything");

    expect(result).toEqual({ id: "anything", name: 123, anythingGoes: true });
    expect(logInvalidDocument).not.toHaveBeenCalled();
  });
});
