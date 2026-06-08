# Neon Backup Policy

Production database: Neon Postgres, referenced only through Vercel `DATABASE_URL`.

## Goals

- Protect user accounts, classes, assignments, sessions, subscriptions, and token usage history.
- Keep rollback possible after a bad release or failed Prisma migration.
- Make restore steps clear enough to execute under pressure.

## Backup Rules

- Enable Neon automatic backups / point-in-time restore for the production project when the selected Neon plan supports it.
- Before every production release that includes a Prisma migration, create or verify a fresh restore point in Neon.
- Keep the production connection string only in Vercel environment variables and local `.env.local`; never commit it.
- Review backup health weekly and run a restore drill at least monthly.

## Pre-Deploy Checklist

1. Confirm CI is green on `main`.
2. Review `prisma/migrations/*` included in the release.
3. Confirm Neon backup / PITR status is healthy.
4. Record the deploy time and Git commit in `CHANGELOG.md`.
5. Deploy production from `main`.

## Restore Procedure

1. Stop new risky writes by rolling back the app in Vercel or temporarily disabling the affected feature.
2. In Neon, restore the production database to a new branch or restored database at the last known-good point.
3. Update Vercel `DATABASE_URL` to the restored connection string.
4. Redeploy the last known-good Vercel deployment.
5. Run smoke checks for login, teacher assignment list, student practice list, admin subscriptions, and `/api/auth/session`.
6. Record the incident, restore point, and follow-up fix in `CHANGELOG.md`.

## Data Retention

- Keep production backups according to the paid Neon plan retention window.
- Export a manual encrypted database dump before large schema changes or commercial launch milestones.
- Store manual dumps in a restricted cloud storage location owned by the business, not in Git.
