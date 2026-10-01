-- Normalize the legacy internal free-plan identifier and use the current value for new rows.
UPDATE "Organization"
SET "plan" = 'GRATUIT',
    "billingCycle" = NULL,
    "planEndsAt" = NULL
WHERE "plan" = 'FREE';

ALTER TABLE "Organization"
ALTER COLUMN "plan" SET DEFAULT 'GRATUIT';

UPDATE "Organization"
SET
  "maxUsers" = CASE "plan"
    WHEN 'GRATUIT' THEN 2
    WHEN 'STARTER' THEN 2
    WHEN 'PRO' THEN 5
    WHEN 'BUSINESS' THEN 10
    ELSE "maxUsers"
  END,
  "maxProducts" = CASE "plan"
    WHEN 'GRATUIT' THEN 10
    WHEN 'STARTER' THEN 50
    WHEN 'PRO' THEN 200
    WHEN 'BUSINESS' THEN 500
    ELSE "maxProducts"
  END
WHERE "plan" IN ('GRATUIT', 'STARTER', 'PRO', 'BUSINESS');
