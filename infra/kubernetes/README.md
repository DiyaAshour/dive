# HandMeKey Kubernetes production topology

This directory is a production topology template, not a local-development requirement.

`handmekey-platform.yaml` runs at least three stateless web replicas and two horizontally safe workers. Web traffic is protected by a PodDisruptionBudget and HPA. Workers can overlap safely because durable platform jobs, search-index tasks and outbox events use database claims/leases or idempotent delivery.

Before deployment:

1. Replace `HANDMEKEY_IMAGE` with the immutable image digest produced by CI.
2. Create the `handmekey-runtime` Secret from the production secret manager. Never commit its values.
3. Point `DATABASE_URL` to a managed PostgreSQL cluster with multi-zone failover, PITR and connection pooling. Do not run the booking source-of-truth database as a single Kubernetes pod.
4. Put the Service behind a TLS ingress/load balancer/CDN with DDoS/WAF controls.
5. Configure metrics-server (or an equivalent metrics adapter) before enabling the HPA.
6. Run the load, failover and restore certification gates in `docs/HA_RUNBOOK.md` before production promotion.

The platform remains correct without Redis, Kafka or OpenSearch. Those providers can be added behind explicit boundaries when traffic justifies them; bookings, inventory, payments and money remain PostgreSQL-authoritative.
