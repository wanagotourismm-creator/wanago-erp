import { readFileSync } from "fs";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "wanago-erp-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Seeds a users/{uid} doc with the given role, bypassing rules — every
// role-gated rule reads this via getUserRole(), so tests need it to exist.
// employeeId mirrors what syncEmployeeIdOnUser denormalizes onto a real
// account once its Employee record is linked — needed for the
// assignedTo-based visibility tests below.
async function seedUser(uid: string, systemRole: string, employeeId?: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`users/${uid}`).set({
      systemRole, officeId: "office_1", ...(employeeId ? { employeeId } : {}),
    });
  });
}

describe("firestore.rules — leads", () => {
  it("blocks an unauthenticated read", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("leads").doc("l1").set({ name: "Jane" });
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("leads").doc("l1").get());
  });

  it("allows an authenticated create with the required fields", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      db.collection("leads").doc("l1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "new",
      })
    );
  });

  it("blocks a create missing the required fields", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("leads").doc("l2").set({ name: "Jane" }));
  });
});

describe("firestore.rules — leads/customers/bookings assignment-based visibility", () => {
  async function seedLead(id: string, assignedTo: string | null) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("leads").doc(id).set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "owner", status: "new",
        assignedTo,
      });
    });
  }

  it("lets a sales user read an unassigned lead", async () => {
    await seedLead("l1", null);
    await seedUser("u1", "sales", "emp_u1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("leads").doc("l1").get());
  });

  it("lets a sales user read their own assigned lead", async () => {
    await seedLead("l1", "emp_u1");
    await seedUser("u1", "sales", "emp_u1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("leads").doc("l1").get());
  });

  it("blocks a sales user from reading a lead assigned to someone else", async () => {
    await seedLead("l1", "emp_other");
    await seedUser("u1", "sales", "emp_u1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("leads").doc("l1").get());
  });

  it("lets operations read a lead assigned to someone else (default view_all)", async () => {
    await seedLead("l1", "emp_other");
    await seedUser("u1", "operations", "emp_u1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("leads").doc("l1").get());
  });

  it("lets sales_head read a lead assigned to someone else (default view_all)", async () => {
    await seedLead("l1", "emp_other");
    await seedUser("head1", "sales_head", "emp_head1");
    const db = testEnv.authenticatedContext("head1").firestore();
    await assertSucceeds(db.collection("leads").doc("l1").get());
  });

  it("lets admin read a lead assigned to someone else regardless of the permission map", async () => {
    await seedLead("l1", "emp_other");
    await seedUser("admin1", "admin", "emp_admin1");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(db.collection("leads").doc("l1").get());
  });

  it("respects a saved role-permission override granting marketing leads:view_all", async () => {
    await seedLead("l1", "emp_other");
    await seedUser("u1", "marketing", "emp_u1");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("settings/rolePermissions").set({
        roles: { marketing: ["leads:view_all", "leads:view_own", "leads:create", "leads:edit"] },
      });
    });
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("leads").doc("l1").get());
  });

  it("blocks marketing from reading someone else's lead when no override grants view_all", async () => {
    await seedLead("l1", "emp_other");
    await seedUser("u1", "marketing", "emp_u1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("leads").doc("l1").get());
  });

  it("blocks a sales user from reading a booking assigned to someone else", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("bookings").doc("b1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "owner", status: "pending", assignedTo: "emp_other",
      });
    });
    await seedUser("u1", "sales", "emp_u1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("bookings").doc("b1").get());
  });

  // Finance isn't in the generic view-all default for leads/customers, but
  // it does need to see every booking to approve ones it isn't assigned to
  // — regression test for the bug caught while writing this: an earlier
  // version of defaultViewAllRoles() only listed operations/sales_head and
  // would have silently hidden every unassigned booking from Finance.
  it("lets finance read a booking assigned to someone else (bookings-only default view_all)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("bookings").doc("b1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "owner", status: "pending", assignedTo: "emp_other",
      });
    });
    await seedUser("fin1", "finance", "emp_fin1");
    const db = testEnv.authenticatedContext("fin1").firestore();
    await assertSucceeds(db.collection("bookings").doc("b1").get());
  });

  it("blocks finance from reading a lead assigned to someone else (no leads default for finance)", async () => {
    await seedLead("l1", "emp_other");
    await seedUser("fin1", "finance", "emp_fin1");
    const db = testEnv.authenticatedContext("fin1").firestore();
    await assertFails(db.collection("leads").doc("l1").get());
  });
});

describe("firestore.rules — users (self-escalation)", () => {
  it("lets a user update their own displayName", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("users").doc("u1").update({ displayName: "New Name" }));
  });

  it("blocks a user from escalating their own systemRole", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("users").doc("u1").update({ systemRole: "super_admin" }));
  });

  it("lets an admin change another user's systemRole", async () => {
    await seedUser("admin1", "admin");
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(db.collection("users").doc("u1").update({ systemRole: "finance" }));
  });
});

describe("firestore.rules — invoices (finance-only writes)", () => {
  it("blocks a non-finance role from creating an invoice", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      db.collection("invoices").doc("inv1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "draft",
      })
    );
  });

  it("allows a finance role to create an invoice", async () => {
    await seedUser("u1", "finance");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      db.collection("invoices").doc("inv1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "draft",
      })
    );
  });
});

// Regression test for the documented "rules are OR'd, not most-specific-wins"
// gotcha (see the big comment above the catch-all match block in
// firestore.rules): a dedicated admin-only rule on a sensitive collection is
// silently overridden unless that collection is also excluded by name from
// the generic catch-all's broader isAuthenticated() grant. This test exists
// so removing an exclusion by accident fails CI instead of shipping a leak.
describe("firestore.rules — catch-all does not leak admin-only collections", () => {
  async function seedDoc(collectionName: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(collectionName).doc("doc1").set({ seeded: true });
    });
  }

  it.each([
    "activities", "systemUsage", "teamPulseResponses", "aiUsageLogs", "aiActionLogs", "aiPredictions",
    "hrmsPayroll", "hrmsSuspiciousAttendance", "performanceReviews", "performanceGoals", "candidates", "jobOpenings",
  ])(
    "blocks a non-admin authenticated read of %s",
    async (collectionName) => {
      await seedDoc(collectionName);
      await seedUser("u1", "sales");
      const db = testEnv.authenticatedContext("u1").firestore();
      await assertFails(db.collection(collectionName).doc("doc1").get());
    }
  );

  it("still allows an admin to read activities", async () => {
    await seedDoc("activities");
    await seedUser("admin1", "admin");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(db.collection("activities").doc("doc1").get());
  });

  it("allows hr to read activities", async () => {
    await seedDoc("activities");
    await seedUser("hr1", "hr");
    const db = testEnv.authenticatedContext("hr1").firestore();
    await assertSucceeds(db.collection("activities").doc("doc1").get());
  });

  it("allows a user to read their own activity entry", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("activities").doc("a1").set({ actorId: "u1" });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("activities").doc("a1").get());
  });

  it("blocks a user from reading someone else's activity entry", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("activities").doc("a1").set({ actorId: "u2" });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("activities").doc("a1").get());
  });

  it.each(["users", "settings", "hrmsEmployees", "candidates", "performanceReviews", "referralPartners", "helpArticles", "npsResponses", "tallyMappings", "journeys", "segments"])(
    "blocks a non-admin authenticated create of %s",
    async (collectionName) => {
      await seedUser("u1", "sales");
      const db = testEnv.authenticatedContext("u1").firestore();
      await assertFails(
        db.collection(collectionName).doc("doc1").set({
          createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active",
        })
      );
    }
  );

  it.each(["users", "settings", "bookings", "trash", "hrmsLeaves", "tickets", "referralPartners", "npsResponses", "tallyMappings", "journeys", "segments"])(
    "blocks a non-admin authenticated update of %s",
    async (collectionName) => {
      await seedDoc(collectionName);
      await seedUser("u1", "sales");
      const db = testEnv.authenticatedContext("u1").firestore();
      await assertFails(
        db.collection(collectionName).doc("doc1").update({
          createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "changed",
        })
      );
    }
  );
});

describe("firestore.rules — Review & NPS engine (reviewRequests/npsResponses)", () => {
  async function seedDoc(collectionName: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(collectionName).doc("doc1").set({ seeded: true });
    });
  }

  it("allows any authenticated staff member to read npsResponses (reputation dashboard)", async () => {
    await seedDoc("npsResponses");
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("npsResponses").doc("doc1").get());
  });

  it("allows admin to write npsResponses directly", async () => {
    await seedUser("admin1", "admin");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(
      db.collection("npsResponses").doc("doc1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "admin1", status: "active",
      })
    );
  });

  it("allows any authenticated staff member to create/read/update reviewRequests (booking completion trigger)", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      db.collection("reviewRequests").doc("doc1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active", bookingId: "b1",
      })
    );
    await assertSucceeds(db.collection("reviewRequests").doc("doc1").get());
    await assertSucceeds(
      db.collection("reviewRequests").doc("doc1").update({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active", sentAt: new Date(),
      })
    );
  });
});

describe("firestore.rules — Tally export (tallyMappings/tallyExports)", () => {
  async function seedDoc(collectionName: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(collectionName).doc("doc1").set({ seeded: true });
    });
  }

  it("allows any authenticated staff member to read tallyMappings", async () => {
    await seedDoc("tallyMappings");
    await seedUser("u1", "finance");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("tallyMappings").doc("doc1").get());
  });

  it("allows admin to write tallyMappings directly", async () => {
    await seedUser("admin1", "admin");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(
      db.collection("tallyMappings").doc("doc1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "admin1", status: "active",
      })
    );
  });

  it("allows any authenticated staff member to create/read tallyExports (export log)", async () => {
    await seedUser("u1", "finance");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      db.collection("tallyExports").doc("doc1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active", periodStart: "2026-07-01",
      })
    );
    await assertSucceeds(db.collection("tallyExports").doc("doc1").get());
  });
});

describe("firestore.rules — Marketing automation (journeys/segments/journeyRuns)", () => {
  async function seedDoc(collectionName: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(collectionName).doc("doc1").set({ seeded: true });
    });
  }

  it("allows any authenticated staff member to read journeys and segments", async () => {
    await seedDoc("journeys");
    await seedDoc("segments");
    await seedUser("u1", "marketing");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("journeys").doc("doc1").get());
    await assertSucceeds(db.collection("segments").doc("doc1").get());
  });

  it("allows admin to write journeys and segments directly", async () => {
    await seedUser("admin1", "admin");
    const db = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(
      db.collection("journeys").doc("doc1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "admin1", status: "active",
      })
    );
  });

  it("allows any authenticated staff member to create/read journeyRuns", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      db.collection("journeyRuns").doc("doc1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active", journeyId: "j1",
      })
    );
    await assertSucceeds(db.collection("journeyRuns").doc("doc1").get());
  });
});

describe("firestore.rules — HR creating a login account for a new employee", () => {
  it("lets hr create a users doc with a non-admin systemRole", async () => {
    await seedUser("hr1", "hr");
    const db = testEnv.authenticatedContext("hr1").firestore();
    await assertSucceeds(
      db.collection("users").doc("newuser1").set({ systemRole: "sales", officeId: "office_1" })
    );
  });

  it("blocks hr from creating a users doc with systemRole admin", async () => {
    await seedUser("hr1", "hr");
    const db = testEnv.authenticatedContext("hr1").firestore();
    await assertFails(
      db.collection("users").doc("newuser1").set({ systemRole: "admin", officeId: "office_1" })
    );
  });

  it("blocks hr from creating a users doc with systemRole super_admin", async () => {
    await seedUser("hr1", "hr");
    const db = testEnv.authenticatedContext("hr1").firestore();
    await assertFails(
      db.collection("users").doc("newuser1").set({ systemRole: "super_admin", officeId: "office_1" })
    );
  });
});

describe("firestore.rules — HR/payroll data (sensitive)", () => {
  it("blocks a sales role from reading payroll", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsPayroll").doc("p1").set({ netPay: 50000 });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("hrmsPayroll").doc("p1").get());
  });

  it("allows finance to read payroll", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsPayroll").doc("p1").set({ netPay: 50000 });
    });
    await seedUser("u1", "finance");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("hrmsPayroll").doc("p1").get());
  });

  it("allows an employee to read their own payslip", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsEmployees").doc("emp1").set({ userId: "u1" });
      await context.firestore().collection("hrmsPayroll").doc("p1").set({ netPay: 50000, employeeId: "emp1" });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("hrmsPayroll").doc("p1").get());
  });

  it("blocks an employee from reading a colleague's payslip", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsEmployees").doc("emp1").set({ userId: "u1" });
      await context.firestore().collection("hrmsEmployees").doc("emp2").set({ userId: "u2" });
      await context.firestore().collection("hrmsPayroll").doc("p1").set({ netPay: 50000, employeeId: "emp2" });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("hrmsPayroll").doc("p1").get());
  });
});

describe("firestore.rules — customer reassignment", () => {
  it("blocks a plain sales user from reassigning a customer's owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("customers").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active", assignedTo: "u1",
      });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("customers").doc("c1").update({ assignedTo: "u2" }));
  });

  it("allows sales_head to reassign a customer's owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("customers").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "active", assignedTo: "u1",
      });
    });
    await seedUser("head1", "sales_head");
    const db = testEnv.authenticatedContext("head1").firestore();
    await assertSucceeds(db.collection("customers").doc("c1").update({ assignedTo: "u2" }));
  });
});

describe("firestore.rules — quotations (sales/admin create, finance approval gate)", () => {
  it("blocks operations role from creating a quotation", async () => {
    await seedUser("u1", "operations");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      db.collection("quotations").doc("q1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "draft",
        financeApprovalStatus: "pending",
      })
    );
  });

  it("blocks sales from directly approving their own quotation", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("quotations").doc("q1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "draft",
        financeApprovalStatus: "pending",
      });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("quotations").doc("q1").update({ financeApprovalStatus: "approved" }));
  });
});

describe("firestore.rules — bookings approval-trail protection", () => {
  it("blocks a plain sales user from setting their own booking's finance approval", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("bookings").doc("b1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "pending_finance",
      });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      db.collection("bookings").doc("b1").update({ financeApprovedBy: "u1", status: "confirmed" })
    );
  });
});

describe("firestore.rules — Team Pulse (can't forge another user's response)", () => {
  it("blocks creating a response with someone else's createdBy", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      db.collection("teamPulseResponses").doc("round1_u2").set({ createdBy: "u2", mood: "good" })
    );
  });

  it("allows creating your own response", async () => {
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      db.collection("teamPulseResponses").doc("round1_u1").set({ createdBy: "u1", mood: "good" })
    );
  });
});

describe("firestore.rules — lead reassignment", () => {
  it("blocks a plain sales user from reassigning a lead's owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("leads").doc("l1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "new", assignedTo: "u1",
      });
    });
    await seedUser("u1", "sales");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("leads").doc("l1").update({ assignedTo: "u2", agentName: "Agent Two" }));
  });

  it("allows sales_head to reassign a lead's owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("leads").doc("l1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "new", assignedTo: "u1",
      });
    });
    await seedUser("head1", "sales_head");
    const db = testEnv.authenticatedContext("head1").firestore();
    await assertSucceeds(db.collection("leads").doc("l1").update({ assignedTo: "u2" }));
  });
});

describe("firestore.rules — hrmsCheckIns ownership", () => {
  async function seedEmployee(id: string, userId: string, reportingManagerId: string | null = null) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsEmployees").doc(id).set({ userId, reportingManagerId });
    });
  }

  it("blocks a coworker from writing another employee's attendance record", async () => {
    await seedEmployee("emp1", "u1");
    await seedEmployee("emp2", "u2");
    await seedUser("u1", "sales", "emp1");
    await seedUser("u2", "sales", "emp2");
    const db = testEnv.authenticatedContext("u2").firestore();
    await assertFails(
      db.collection("hrmsCheckIns").doc("a1").set({
        employeeId: "emp1", date: "2026-07-18", clockIn: "09:00", clockOut: null,
      })
    );
  });

  it("allows an employee to write their own attendance record", async () => {
    await seedEmployee("emp1", "u1");
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(
      db.collection("hrmsCheckIns").doc("a1").set({
        employeeId: "emp1", date: "2026-07-18", clockIn: "09:00", clockOut: null,
      })
    );
  });

  it("allows HR to write any employee's attendance record", async () => {
    await seedEmployee("emp1", "u1");
    await seedUser("u1", "sales", "emp1");
    await seedUser("hr1", "hr");
    const db = testEnv.authenticatedContext("hr1").firestore();
    await assertSucceeds(
      db.collection("hrmsCheckIns").doc("a1").set({
        employeeId: "emp1", date: "2026-07-18", clockIn: "09:00", clockOut: null,
      })
    );
  });

  it("allows the functional manager (not the reporting manager) to decide a pending location approval", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsEmployees").doc("mgr1").set({ userId: "reportinguid", reportingManagerId: null });
      await context.firestore().collection("hrmsEmployees").doc("fmgr1").set({ userId: "functionaluid", reportingManagerId: null });
      await context.firestore().collection("hrmsEmployees").doc("emp1").set({ userId: "u1", reportingManagerId: "mgr1", functionalManagerId: "fmgr1" });
      await context.firestore().collection("hrmsCheckIns").doc("a1").set({
        employeeId: "emp1", date: "2026-07-18", clockIn: "09:00", clockOut: null, locationApprovalStatus: "pending",
      });
    });
    await seedUser("functionaluid", "sales", "fmgr1");
    const db = testEnv.authenticatedContext("functionaluid").firestore();
    await assertSucceeds(
      db.collection("hrmsCheckIns").doc("a1").update({ locationApprovalStatus: "approved", locationApprovedBy: "functionaluid" })
    );
  });

  it("blocks an unrelated employee (neither manager) from deciding a pending location approval", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsEmployees").doc("mgr1").set({ userId: "reportinguid", reportingManagerId: null });
      await context.firestore().collection("hrmsEmployees").doc("emp1").set({ userId: "u1", reportingManagerId: "mgr1", functionalManagerId: null });
      await context.firestore().collection("hrmsEmployees").doc("other1").set({ userId: "otheruid", reportingManagerId: null });
      await context.firestore().collection("hrmsCheckIns").doc("a1").set({
        employeeId: "emp1", date: "2026-07-18", clockIn: "09:00", clockOut: null, locationApprovalStatus: "pending",
      });
    });
    await seedUser("otheruid", "sales", "other1");
    const db = testEnv.authenticatedContext("otheruid").firestore();
    await assertFails(
      db.collection("hrmsCheckIns").doc("a1").update({ locationApprovalStatus: "approved", locationApprovedBy: "otheruid" })
    );
  });
});

describe("firestore.rules — leave/regularization/asset-request self-approval protection", () => {
  async function seedEmployee(id: string, userId: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsEmployees").doc(id).set({ userId, reportingManagerId: null });
    });
  }

  it("blocks an employee from approving their own leave request", async () => {
    await seedEmployee("emp1", "u1");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsLeaves").doc("lv1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "pending", employeeId: "emp1",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      db.collection("hrmsLeaves").doc("lv1").update({ status: "approved", approvedBy: "u1" })
    );
  });

  it("allows an employee to cancel their own pending leave request", async () => {
    await seedEmployee("emp1", "u1");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsLeaves").doc("lv1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "pending", employeeId: "emp1",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("hrmsLeaves").doc("lv1").update({ status: "cancelled" }));
  });

  it("blocks an employee from approving their own regularization request", async () => {
    await seedEmployee("emp1", "u1");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsRegularizations").doc("r1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "pending",
        regularizationStatus: "pending", employeeId: "emp1",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      db.collection("hrmsRegularizations").doc("r1").update({ regularizationStatus: "approved", approvedBy: "u1" })
    );
  });

  it("blocks an employee from approving their own asset request", async () => {
    await seedEmployee("emp1", "u1");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("assetRequests").doc("ar1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "pending",
        requestStatus: "pending", employeeId: "emp1",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(
      db.collection("assetRequests").doc("ar1").update({ requestStatus: "approved", approvedBy: "u1" })
    );
  });

  it("allows a reporting manager to approve their report's leave request", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("hrmsEmployees").doc("mgr1").set({ userId: "mgruid", reportingManagerId: null });
      await context.firestore().collection("hrmsEmployees").doc("emp1").set({ userId: "u1", reportingManagerId: "mgr1" });
      await context.firestore().collection("hrmsLeaves").doc("lv1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "u1", status: "pending", employeeId: "emp1",
      });
    });
    await seedUser("mgruid", "sales", "mgr1");
    const db = testEnv.authenticatedContext("mgruid").firestore();
    await assertSucceeds(
      db.collection("hrmsLeaves").doc("lv1").update({ status: "approved", approvedBy: "mgruid" })
    );
  });
});

describe("firestore.rules — WhatsApp conversation assignment (per-employee inbox)", () => {
  it("blocks a sales user from reading a conversation assigned to a different agent", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: "emp2",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("whatsappConversations").doc("c1").get());
  });

  it("allows a sales user to read their own assigned conversation", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: "emp1",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("whatsappConversations").doc("c1").get());
  });

  it("allows a sales user to read an unassigned conversation", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: null,
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("whatsappConversations").doc("c1").get());
  });

  it("allows sales_head to read a conversation assigned to someone else (whatsapp:view_all default)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: "emp2",
      });
    });
    await seedUser("head1", "sales_head");
    const db = testEnv.authenticatedContext("head1").firestore();
    await assertSucceeds(db.collection("whatsappConversations").doc("c1").get());
  });

  it("blocks a plain sales user from reassigning an already-assigned conversation", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: "emp1",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("whatsappConversations").doc("c1").update({ assignedTo: "emp2", agentName: "Someone Else" }));
  });

  it("allows a sales user to claim an unassigned conversation", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: null,
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("whatsappConversations").doc("c1").update({ assignedTo: "emp1", agentName: "Agent One" }));
  });

  it("blocks a sales user from reading messages in a conversation assigned to someone else", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: "emp2",
      });
      await context.firestore().collection("whatsappMessages").doc("m1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        conversationId: "c1", direction: "inbound", body: "hello",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.collection("whatsappMessages").doc("m1").get());
  });

  it("allows a sales user to read messages in their own assigned conversation", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("whatsappConversations").doc("c1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        phoneNumber: "+919876543210", assignedTo: "emp1",
      });
      await context.firestore().collection("whatsappMessages").doc("m1").set({
        createdAt: new Date(), updatedAt: new Date(), createdBy: "system", status: "active",
        conversationId: "c1", direction: "inbound", body: "hello",
      });
    });
    await seedUser("u1", "sales", "emp1");
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.collection("whatsappMessages").doc("m1").get());
  });
});
