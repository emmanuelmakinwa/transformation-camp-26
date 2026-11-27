# Operations dashboard and administrator roles — rollout notes

This feature is implemented on `feature/operations-dashboard-admin-roles-countdown`. Do not merge it into `main` or apply its migration to the production Supabase project until the preview has been reviewed and production rollout is explicitly approved.

## Required rollout order

1. Create or select a dedicated preview Supabase project. Do not point preview at the live production database for role-management testing.
2. Apply `supabase/migrations/20261128130000_create_admin_users.sql` to that preview database.
3. In Supabase Auth URL Configuration, allow the exact invite redirect URL:
   `https://www.transformationcamp.com.ng/admin/accept-invite`
   For preview testing, add the preview hostname's equivalent as well.
4. Set Vercel `ADMIN_INVITE_REDIRECT_URL` in the appropriate environment to the matching allowed URL. The default is the production URL above.
5. Ensure preview has the existing Supabase URL, anon key, and secret key for the preview project only.
6. Test both roles:
   - Super Admin: dashboard, general/ministers management, check-in, and administrator management.
   - Check-in Staff: attendee search and check-in only; direct requests to other admin APIs must return 403.
7. Test invitation acceptance, password setup, sign-in, role changes, deactivation, and last-Super-Admin protection.
8. Only after review, apply the migration to production before deploying the role-aware application code to production.

## Role bootstrap and access model

- Existing addresses in `ADMIN_EMAILS` are bootstrapped as `super_admin` the first time they authenticate after the migration is present.
- Once a row exists in `public.admin_users`, its database role and active flag are authoritative. A deactivated row is not re-created from the legacy allowlist.
- New accounts are invited through Supabase Auth from the server using `SUPABASE_SECRET_KEY`. The key is never sent to the browser.
- The invite redirect must be allowlisted in Supabase Auth. Invitation links use the project's configured email OTP expiry.
- The `admin_users` table has RLS enabled and grants no table access to `anon` or `authenticated`; trusted server routes use the secret key.

## Reporting definitions

- Unique attendance: registered records with at least one check-in across any session.
- Total session check-ins: all check-in records, so one attendee can contribute more than one across the seven sessions.
- Outstanding attendees: total general and minister registrations minus unique registered records checked in at least once.
- Registration trend: daily general and minister registrations for the last 14 calendar days in Africa/Lagos time.
- Accommodation requests: general registrations marked required plus minister registrations marked yes. Minister registrations marked not sure are shown separately.

## Important

The dashboard currently reads up to 100,000 rows per source using paginated server-side requests. If event data exceeds that limit, the API returns an error rather than silently presenting partial totals. For materially larger events, replace the in-process aggregation with database-side aggregate queries or a secured reporting RPC.
