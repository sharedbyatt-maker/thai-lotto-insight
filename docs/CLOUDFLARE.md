# Direct Cloudflare deployment

From the repository root, sign in to the intended Cloudflare account using Wrangler. Create or select the `thai-lotto-insight` D1 database. Set `LOTTO_D1_ID` to that database UUID, then run:

```sh
npm ci
npm run build
node scripts/configure-cloudflare.mjs
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.production.json
npx wrangler deploy --config dist/server/wrangler.production.json
npx wrangler secret put SYNC_TOKEN --config dist/server/wrangler.production.json
```

Pick a strong random secret for the protected sync and restore endpoints. On direct Cloudflare hosting those endpoints use bearer authentication. The Sites-specific sign-in headers are stripped at the Worker boundary. Never put the token into the mobile app or source control.

Restore an owner-exported backup while the database is empty, before the first scheduled write. If importing a backup, deploy initially with Cron disabled in the generated config and deploy again with the original trigger after the restore. Otherwise seed the result archive from GLO. The published `/api/results` should return the latest verified draw. Verify a scheduled invocation in Worker logs and confirm that it reaches the same D1 binding used by the public API. Use the resulting HTTPS origin for Android and Safari Home Screen.

## Deploy from GitHub Actions

Set repository variables `CLOUDFLARE_ACCOUNT_ID` and `LOTTO_D1_ID`, and a repository secret `CLOUDFLARE_API_TOKEN` scoped to the account with Workers deployment and D1 migration access. Run **Deploy Cloudflare Worker** from the intended branch. The first run can leave Cron disabled while transferring data. Set the Worker secret `SYNC_TOKEN` directly in Cloudflare, restore or seed the database, and rerun with Cron enabled. Keep the token out of GitHub workflow inputs and out of mobile builds.
