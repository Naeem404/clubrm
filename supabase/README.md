# ClubRM – Supabase migrations

All files are plain SQL. Apply them in the **Supabase Dashboard → SQL Editor**
(New query → paste the file → Run), in this order:

| # | File | Notes |
|---|------|-------|
| 1 | `migration.sql` | Base schema. **CLEAN INSTALL – drops and recreates all app tables.** Only run on a fresh project. |
| 2 | `migration-add-tables.sql` | documents / notifications / org_settings (idempotent). |
| 3 | `migration-onboarding-flag.sql` | `profiles.onboarding_completed`. |
| 4 | `migration-rls-jwt.sql` | Legacy. Superseded by #6 (safe to skip on new projects). |
| 5 | `migration-strengthen-rls.sql` | Legacy. Superseded by #6 (safe to skip on new projects; adds `organization_id` columns that the frontend still references). |
| 6 | `migration-security-hardening.sql` | **Run last.** Idempotent; re-run it any time after touching policies. |

> If you ever re-run #4 or #5, re-run #6 afterwards – it drops every policy on the app
> tables and recreates the canonical set.

## What `migration-security-hardening.sql` does

- Roles live **only** in `public.profiles.role` (no JWT claim roles).
- Helpers: `current_user_role()`, `has_role(text[])`, `is_admin()` (President/Administrator),
  `is_exec()` (exec board), `has_permission(text)` (matrix from `docs/02_ROLES_AND_PERMISSIONS.txt`).
- New signups always get role `member` (`handle_new_user`, idempotent).
- `profiles.role` can only be changed by a President/Administrator (or service role / SQL editor);
  the last President/Administrator cannot be demoted; every change is written to `public.audit_logs`.
- RPC to change roles from the app:
  ```ts
  await supabase.rpc("set_member_role", { target_user: userId, new_role: "VP Events" })
  ```
- Clean RLS policies on every app table + the private `documents` storage bucket.

## Bootstrapping the first President

Every new account is a `member`. Promote the first admin from the SQL editor
(the editor runs without a JWT, so the role guard allows it):

```sql
update public.profiles set role = 'President' where email = 'you@example.com';
```

After that, use `set_member_role` from the app.

## Verify

```sql
select tablename, policyname, cmd from pg_policies
where schemaname in ('public','storage') order by tablename, cmd;

select * from public.audit_logs order by created_at desc limit 20;
```
