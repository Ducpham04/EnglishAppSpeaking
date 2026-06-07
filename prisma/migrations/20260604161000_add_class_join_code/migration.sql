ALTER TABLE "classes" ADD COLUMN "joinCode" TEXT;

UPDATE "classes"
SET "joinCode" = UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 6))
WHERE "joinCode" IS NULL;

ALTER TABLE "classes" ALTER COLUMN "joinCode" SET NOT NULL;

CREATE UNIQUE INDEX "classes_joinCode_key" ON "classes"("joinCode");
