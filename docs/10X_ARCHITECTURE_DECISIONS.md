# Architecture decisions

- Keep the modular monolith.
- Keep PostgreSQL authoritative for bookings, inventory, payments and financial state.
- Use durable outbox/job patterns before introducing external brokers.
- Keep search and analytics replaceable providers, never sources of truth.
- Require deterministic experimentation with exposure logging.
