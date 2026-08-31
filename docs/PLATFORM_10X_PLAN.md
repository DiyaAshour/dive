# HandMeKey Platform 10x Program

This branch upgrades the platform toward production-grade booking correctness, horizontal scalability, high availability, search, analytics and experimentation without replacing the modular-monolith boundaries.

## Certification rule

A subsystem is not called 10/10 because code exists. It earns that rating only after correctness, load, failover and recovery tests pass in an environment that matches production.

## Workstreams

1. Booking and inventory correctness: atomic stay reservation, idempotency, reconciliation and concurrency testing.
2. Scalability: stateless app nodes, durable background work, cache/provider boundaries and backpressure.
3. High availability: health/readiness contracts, graceful shutdown, restore/failover drills and SLOs.
4. Search: normalization, provider abstraction, asynchronous indexing and source-of-truth separation.
5. Analytics: versioned events, transactional outbox, deduplication and warehouse-friendly exports.
6. Experimentation: deterministic assignment, sticky variants, explicit exposure logging and guardrails.

## Non-goals

- Splitting the codebase into microservices prematurely.
- Making Redis, OpenSearch, Kafka or a data warehouse mandatory for local development.
- Allowing caches, search indexes or analytics stores to become authoritative for bookings, inventory, payments or money.
