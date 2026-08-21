# Security policy notes

## Dependency audit policy

CI runs `scripts/security-audit.mjs` after dependency installation. High and critical findings fail the build unless they match an explicit, time-bounded upstream exception in that script.

An exception is not a permanent suppression. It must identify the exact advisory and package and it automatically becomes blocking after its expiry date.

## Current upstream Prisma CLI exception

As of 2026-08-21, Prisma 7.9.1's configuration/CLI dependency graph pins `deepmerge-ts` 7.1.5. GitHub advisory `GHSA-ggr8-5vv4-36mx` affects `deepmerge-ts` versions below 8.0.0.

The affected path is Prisma configuration/CLI tooling. The application runtime does not invoke Prisma configuration merging with request-controlled object graphs. Prisma 7.x also currently causes CLI tooling to appear in production dependency audits through its peer dependency graph.

The repository therefore carries a narrowly scoped exception for this single advisory through 2026-09-15. Any other high/critical advisory remains blocking. If Prisma publishes a compatible release that removes the vulnerable dependency before then, the exception must be deleted immediately. If not, the exception expires and CI fails rather than silently extending it.

Do not use `npm audit fix --force` to make this warning disappear. A forced major Prisma downgrade or unrelated dependency rewrite must only happen through a reviewed migration with passing generation, typecheck, build, and database tests.
