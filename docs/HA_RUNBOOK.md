# High availability and disaster recovery runbook

## Production objectives

- Marketplace availability SLO: 99.95% monthly.
- Booking mutation availability SLO: 99.99% monthly, excluding provider-declared payment outages.
- Booking and inventory correctness objective: no accepted reservation may violate configured inventory floors.
- Database RPO target: <= 5 minutes.
- Database RTO target: <= 15 minutes.
- Web deployment: zero planned downtime through rolling updates and readiness gates.

These are targets, not claims. They become certified only after the environment-specific drills below pass.

## Required production topology

- At least 3 stateless web replicas across failure zones.
- At least 2 background workers. Work claiming must remain safe when both process the same queues.
- Managed PostgreSQL primary with synchronous or provider-supported multi-zone standby, automatic failover, point-in-time recovery and pooled application connections.
- Object storage with provider durability guarantees for public media and private verification documents.
- External TLS load balancer/CDN/WAF.
- Central metrics, logs and alerting for API latency/error rate, database saturation, queue age, outbox dead letters, search indexing lag and payment failures.

## Failover drill

Run in staging with production-like topology at least quarterly and after material database/topology changes.

1. Start sustained read/search traffic plus controlled booking traffic using test inventory.
2. Trigger managed-database failover using the provider-supported operation.
3. Observe connection errors, retry rate, booking outcomes and inventory values.
4. Confirm the application reconnects without operator data edits.
5. Reconcile every test booking event against booking state, inventory and financial events.
6. Fail the drill if a confirmed booking disappears, inventory crosses its configured floor, a financial confirmation is duplicated, or recovery exceeds the RTO target.

## Backup restore drill

1. Select a known recovery timestamp and record expected booking counts/checksums before it.
2. Restore PITR into an isolated database, never over the active production primary.
3. Run migrations/status checks and reconciliation queries against the restored copy.
4. Verify booking references, nightly price snapshots, inventory, payment attempts and financial events.
5. Measure restore duration and effective data loss window.
6. Destroy the isolated restore after evidence is retained.

A backup is not considered operationally valid until a restore drill succeeds.

## Worker-loss drill

1. Queue durable jobs, search-index tasks and analytics outbox events.
2. Terminate one worker while it owns leases.
3. Confirm another worker recovers expired leases and processes the work.
4. Confirm completed jobs and published outbox events are not executed again.

## Web-node-loss drill

1. Run load through the production load balancer.
2. Terminate one web replica.
3. Confirm readiness removes it before traffic is sent and the remaining replicas stay within latency/error SLOs.
4. Repeat during a rolling deployment.

## Promotion gate

Production promotion is blocked when any of these are true: migration history is dirty; booking concurrency torture fails; platform 10x smoke fails; backup restore evidence is stale; database failover evidence is stale; dead-letter queues contain unexplained booking/payment work; or p99 booking latency/error thresholds exceed the agreed release budget.
