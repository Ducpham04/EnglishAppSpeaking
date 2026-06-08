# Branching and Release Policy

## Branches

- `develop`: integration branch for daily work.
- `main`: production branch. Only merge here after CI passes and release notes are prepared.

## Update Flow

1. Create a feature/fix branch from `develop`.
2. Implement the change.
3. Run local quality checks:

   ```bash
   npm run lint
   npm run type-check
   npm test -- --run
   npm run build
   ```

4. Open a pull request into `develop`.
5. Wait for GitHub Actions CI to pass.
6. Merge into `develop`.
7. When ready to release, open a pull request from `develop` into `main`.
8. Add release notes to `CHANGELOG.md`.
9. Merge into `main` only after CI passes.
10. Deploy production from `main`.

## Production Deploy Command

```bash
npx vercel deploy --prod --yes --force --archive=tgz --logs
```

## Release Checklist

- CI is green on `main`.
- `CHANGELOG.md` has a new entry.
- Prisma migrations have been reviewed.
- Vercel production env vars are present.
- Smoke checks pass after deploy:
  - `/`
  - `/login`
  - `/api/auth/session`
  - role dashboards with seeded or real accounts

## Rollback

If a release causes a production issue:

1. Use Vercel rollback to promote the previous healthy deployment.
2. If database changes are involved, check `docs/NEON_BACKUP_POLICY.md`.
3. Open a hotfix branch from `main`.
4. Fix, test, merge, redeploy.
