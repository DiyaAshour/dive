# 10x certification checklist

This file is intentionally short. The detailed implementation plan is in `PLATFORM_10X_PLAN.md`.

- Booking correctness: concurrency, idempotency, reconciliation, atomic stay reservation.
- Scalability: stateless app, durable jobs, provider boundaries, backpressure and load tests.
- High availability: health probes, graceful shutdown, failover drills, backup/restore and SLOs.
- Search: normalization, provider abstraction, async indexing and authoritative revalidation.
- Analytics: versioned events, outbox delivery, deduplication and warehouse export.
- Experiments: deterministic assignment, exposure logging, guardrails and kill switch.
