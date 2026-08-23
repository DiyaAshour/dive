# Phase 18 — Secure Admin Foundation

Phase 18 turns platform administration into a separate security boundary while preserving the shared HandMeKey identity and database.

## Portal contract

```text
local                           production target
/login                          handmekey.com/login
/partner/login                  partners.handmekey.com/login
/admin/login                    admin.handmekey.com/login
```

The portals share `User`, `Credential`, authorization services and PostgreSQL. They do not share an interchangeable browser session.

## Security invariants

- Traveler/partner sessions use the `STANDARD` scope and `hp_session` cookie.
- Control Center sessions use the `ADMIN` scope and `hp_admin_session` cookie.
- Admin cookies are HTTP-only, `SameSite=Strict`, secure in production, and expire after 8 hours by default.
- An admin API accepts only an unexpired `ADMIN` session whose current user role is still `PLATFORM_ADMIN`.
- A standard session belonging to the same user cannot authorize an admin endpoint.
- `PLATFORM_ADMIN` no longer bypasses hotel-membership checks in Partner APIs. Platform-wide property access belongs to explicit admin services behind the admin session boundary.
- Public admin registration does not exist.
- Bootstrap revokes the target account's existing sessions and records `PLATFORM_ADMIN_BOOTSTRAPPED` in `AuditLog`.
- Sensitive property decisions continue to pass through domain services that authorize and audit the mutation.

## First administrator

Create the person's normal HandMeKey account first, then run once from a trusted deployment console:

```bash
npm run admin:bootstrap -- --email you@example.com
```

The command refuses to promote another account after a credentialed administrator exists. Running it again for the already-bootstrapped account is idempotent. The demo-media uploader is credentialless and is never considered an interactive administrator.

After bootstrap, sign in at:

```text
http://localhost:3000/admin/login
```

## Control Center surfaces

- live property, review, document, suspension and account counts;
- property-review and private-document decision queues;
- platform property status and audited suspension/restore actions;
- real credentialed administrator/session overview;
- recent shared-domain audit activity;
- explicit admin logout.

Navigation links point only to implemented sections. Admin user invitations and role mutation are intentionally not exposed until verified email delivery and a dedicated invitation lifecycle exist.

## Verification

`npm run admin:smoke` verifies bootstrap, session-scope isolation, standard-session denial, hotel-permission isolation and audit creation against PostgreSQL.

After a production build, `npm run admin:http-smoke` starts the built web application and verifies anonymous redirect, non-admin denial, admin cookie issuance, protected page/API access, standard-cookie rejection and logout revocation over HTTP.
