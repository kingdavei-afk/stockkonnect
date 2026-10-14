import assert from "node:assert/strict";
import { test } from "node:test";

import { signSession, verifySession } from "../src/lib/jwt";
import { getPlan, PUBLIC_PLANS } from "../src/lib/plans";
import { tokensMatch, newTransactionId } from "../src/lib/cinetpay";
import { blockDemoWrites, DEMO_ORGANIZATION_SLUG } from "../src/lib/demo-access";
import { referencesBelongToOrganization } from "../src/lib/organization-refs";

test("sessions sign and verify required claims", async () => {
  const claims = { userId: "user-1", orgId: "org-1", role: "ADMIN", sessionVersion: 3 };
  const token = await signSession(claims);
  assert.deepEqual(await verifySession(token), claims);
});

test("invalid and tampered session tokens are rejected", async () => {
  const token = await signSession({ userId: "user-1", orgId: "org-1", role: "STAFF", sessionVersion: 0 });
  assert.equal(await verifySession("not-a-jwt"), null);
  assert.equal(await verifySession(`${token}tampered`), null);
});

test("public plans keep the advertised trial, limits, and annual discount", () => {
  assert.equal(getPlan("GRATUIT").trialDays, 7);
  assert.equal(getPlan("GRATUIT").maxProducts, 10);
  assert.deepEqual(PUBLIC_PLANS.map((plan) => plan.id), ["STARTER", "PRO", "BUSINESS"]);
  for (const plan of PUBLIC_PLANS) assert.equal(plan.yearly, plan.monthly * 10);
  assert.equal(getPlan("unknown").id, "GRATUIT");
});

test("demo organization writes are rejected; normal organizations are not blocked", async () => {
  const blocked = blockDemoWrites({ organization: { slug: DEMO_ORGANIZATION_SLUG } });
  assert.ok(blocked);
  assert.equal(blocked.status, 403);
  assert.deepEqual(await blocked.json(), { error: "Le compte de démonstration est en lecture seule." });
  assert.equal(blockDemoWrites({ organization: { slug: "other-org" } }), null);
});

test("CinetPay webhook tokens compare safely for expected equality cases", () => {
  assert.equal(tokensMatch("token-123", "token-123"), true);
  assert.equal(tokensMatch("token-123", "token-124"), false);
  assert.equal(tokensMatch("token-123", "short"), false);
  assert.equal(tokensMatch("", ""), false);
  assert.equal(tokensMatch(null, "token-123"), false);
});

test("payment references fit the provider limit and use the StockKonect prefix", () => {
  const reference = newTransactionId();
  assert.match(reference, /^SK[a-z0-9]+$/);
  assert.ok(reference.length <= 30);
});

test("tenant-scoped references accept records in the active organization", async () => {
  const count = async ({ where }: { where: { organizationId: string } }) =>
    where.organizationId === "org-1" ? 1 : 0;
  const client = {
    category: { count },
    supplier: { count },
    customer: { count },
  } as unknown as Parameters<typeof referencesBelongToOrganization>[0];

  assert.equal(
    await referencesBelongToOrganization(client, "org-1", {
      categoryId: "category-1",
      supplierId: "supplier-1",
      customerId: "customer-1",
    }),
    true
  );
  assert.equal(await referencesBelongToOrganization(client, "org-2", { supplierId: "supplier-1" }), false);
  assert.equal(await referencesBelongToOrganization(client, "org-1", {}), true);
});
