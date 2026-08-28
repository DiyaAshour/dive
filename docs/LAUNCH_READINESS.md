# HandMeKey Launch Readiness

This document defines the production database, Search 2 and commerce-SEO contract introduced before the first real paid booking.

## Versioned production database

HandMeKey now commits Prisma migrations under `packages/database/prisma/migrations`.

- `20260828000000_baseline` is the exact baseline of the application schema that existed before migration history was committed.
- `20260828001000_search_2` adds the destination registry, aliases, hotel-destination links and PostgreSQL trigram indexes.
- Fresh databases run `npm run db:deploy`.
- Existing HandMeKey databases that were previously managed with `db push` run `npm run db:adopt` once. The adoption command verifies a known HandMeKey database shape, marks only the baseline migration as already applied, then runs `prisma migrate deploy` for later migrations.
- Production deployment runs `db:adopt`; it no longer uses `prisma db push`.

`db:push` remains available only as a local scratch/development utility. It is not the production upgrade strategy.

### Data-preservation rule

Baseline adoption does not recreate application tables or copy booking, payment, invoice, Wallet, email or hotel rows. It refuses to baseline an unknown partial database shape. Backups remain mandatory before a production migration.

## Search 2

Search 2 separates destination understanding from live hotel pricing.

`Destination` is the canonical place entity. It supports country, region, city, area and landmark types, hierarchy, coordinates, radius and localized SEO fields.

`DestinationAlias` stores weighted normalized aliases. Arabic normalization removes diacritics, folds common Alef variants and normalizes Alef Maqsura. PostgreSQL `pg_trgm` indexes provide fuzzy matching after exact and prefix alias resolution.

`HotelDestination` links hotels to canonical destinations. Hotel creation and public-content changes synchronize these links, while the destination seed can rebuild them idempotently.

The first Jordan registry includes Amman, Aqaba, Petra, Dead Sea and common child areas such as Tala Bay, Ayla, South Beach, Sweimeh and Wadi Musa, with Arabic and English aliases.

### Bounded live search

Search never preloads an unbounded hotel catalog. It first retrieves a bounded candidate window with cursor pagination, then prices those candidates through the existing authoritative hotel-offer service. Promotion, inventory, cancellation, service/tax and payment-mode logic therefore remain single-source.

Price sorting evaluates a larger bounded window than recommended sorting. This keeps query cost bounded as the catalog grows without creating a second pricing index that could drift from the booking engine.

## Autocomplete

Public destination suggestions are available at:

`GET /api/v1/discovery/suggestions?q=...&locale=ar|en`

The traveler Home and Search forms use the same accessible combobox. It supports keyboard selection and bilingual destination/hotel suggestions.

## Commerce SEO

Search result combinations remain `noindex`.

Indexable intent pages are canonical content surfaces:

- `/hotels/jordan`
- `/hotels/jordan/amman`
- `/hotels/jordan/aqaba`
- `/hotels/jordan/petra`
- `/hotels/jordan/dead-sea`
- `/hotel/<hotel-slug>`

Destination pages publish localized metadata, canonical URLs, CollectionPage/ItemList/Breadcrumb structured data and only real published hotels.

Hotel pages publish canonical slug URLs, Hotel structured data, verified amenities and location. AggregateRating is emitted only when persisted published verified-stay reviews exist.

The sitemap includes destination and canonical hotel URLs in addition to Rewards and Blog content.

## CI contract

CI must prove all of the following on an empty PostgreSQL database:

1. production dependency audit passes;
2. Prisma Client generates;
3. committed migrations deploy from zero;
4. migration history is clean;
5. demo catalog and destination seed/reseed are idempotent;
6. admin, partner and loyalty smoke tests pass;
7. all workspaces typecheck;
8. the production Next.js build succeeds;
9. administrator HTTP smoke succeeds;
10. Chromium E2E verifies Search 2 aliases, destination landing pages, canonical hotel slugs, sitemap commerce URLs and existing critical public surfaces.
