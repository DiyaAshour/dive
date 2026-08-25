# Phase 26 — Rewards publication, editorial CMS and organic discovery

Phase 26 turns HandMeKey Rewards into a public acquisition surface and adds a first-party editorial publishing system for long-term organic discovery.

## Public Rewards

Localized indexable URLs:

- `/rewards/ar`
- `/rewards/en`
- `/rewards` redirects to the traveler's current locale.

The page explains the actual Phase 25 earning model rather than inventing benefits:

- Member: 10 points per eligible JOD.
- Key Gold: 12 points per eligible JOD from 5 qualifying nights.
- Key Black: 15 points per eligible JOD from 15 qualifying nights.
- Points post after an eligible completed stay.
- Launch earning basis is persisted JOD room base after promotion pricing.
- Service and tax / mandatory charges do not earn.
- Cancelled, no-show, expired and hold bookings do not earn.
- Redemption remains explicitly unavailable until it is connected to checkout and financial accounting.

Each language URL has its own canonical, hreflang alternates, Open Graph metadata and WebPage/Breadcrumb structured data.

## Editorial CMS

Platform administrators receive a new `/admin/blog` publication area.

An article stores:

- Arabic or English locale
- clean multilingual slug
- title and excerpt
- safe Markdown-like body content
- SEO title and SEO description
- category and topic tags
- optional cover image URL + alt text
- author display name
- featured state
- Draft / Published / Archived status
- durable publish/update timestamps
- computed reading time

Publishing mutations require the dedicated admin session and `PLATFORM_ADMIN` authorization. Editorial create/update/publish/unpublish/archive actions are written to the platform Audit Log.

Only `PUBLISHED` posts with an effective publication date are exposed by public services.

## Public publication

Localized indexes:

- `/blog/ar`
- `/blog/en`

Article URLs:

- `/blog/ar/<slug>`
- `/blog/en/<slug>`

Article rendering accepts a deliberately small safe authoring syntax:

- `##` H2
- `###` H3
- `-` or `*` unordered list
- numbered lists
- `>` callout
- `**text**` bold

Raw administrator HTML is never injected into the article body.

Published articles include:

- per-page title and meta description
- canonical URL
- Article JSON-LD
- BreadcrumbList JSON-LD
- Open Graph article metadata
- Twitter metadata
- published and modified timestamps
- semantic headings and article body
- related-article internal links
- links into live stay search and Rewards

## Crawl and discovery

Phase 26 adds:

- `/sitemap.xml` generated from real published posts
- `/robots.txt` that allows public discovery but blocks private/admin/API/account/checkout surfaces
- `/feed.xml` RSS feed for published editorial content
- RSS auto-discovery metadata
- site-wide internal links to Rewards and Travel Guide
- `NEXT_PUBLIC_SITE_URL` as the canonical production origin

Draft and archived posts never enter sitemap or RSS output.

## Editorial SEO guardrails

The Admin editor provides a deterministic content-readiness checklist for:

1. search-title length
2. search-description length
3. useful excerpt length
4. long-form body depth
5. semantic H2 section coverage
6. topical tag coverage
7. image alt text when a cover image is supplied

This is an editorial quality aid, not a promise of search ranking. Google ultimately chooses what to crawl, index and rank.

## Production launch checklist

Before expecting organic traffic:

1. Set `NEXT_PUBLIC_SITE_URL=https://handmekey.com` in production.
2. Deploy with a production PostgreSQL migration workflow.
3. Verify `https://handmekey.com/robots.txt` and `/sitemap.xml` are publicly reachable.
4. Add the domain property in Google Search Console.
5. Submit `/sitemap.xml` in Search Console.
6. Inspect the Rewards pages and first priority articles with URL Inspection.
7. Publish original Jordan-first content written for actual traveler intent rather than keyword repetition.
8. Add first-hand photos, local detail, dates, prices only when sourced and kept current.
9. Review Search Console query/page reports monthly and expand pages that already earn impressions.
10. Distribute strong articles through social/video channels and link back to the canonical article.

## Recommended first editorial clusters

Start narrow in Jordan rather than producing shallow global content:

- Dead Sea hotels and weekend stays
- Aqaba family stays and beachfront choices
- Amman neighborhoods and airport stays
- Petra stay planning and walking-distance questions
- Jordan staycation guides
- breakfast / pool / family / couples / business-trip intent
- transparent hotel pricing and cancellation explainers
- HandMeKey Rewards explainers

Build one authoritative hub and several genuinely useful supporting articles per cluster. Avoid mass-generated near-duplicate destination pages.
